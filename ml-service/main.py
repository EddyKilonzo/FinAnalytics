"""FinAnalytix ML Categorisation Service
========================================
FastAPI wrapper around a scikit-learn text classifier that maps transaction
description text → spending category slug.

Endpoints
---------
GET  /health          — liveness + readiness probe
POST /predict         — classify a description; returns slug + confidence
POST /feedback        — record a user correction for future retraining
POST /retrain         — re-fit the model incorporating all stored feedback

Run locally
-----------
    uvicorn main:app --reload --port 8000

Docker
------
    docker build -t finanalytix-ml .
    docker run -p 8000:8000 finanalytix-ml
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from classifier import TransactionClassifier, VALID_SLUGS

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
log = logging.getLogger("ml-service")

MODEL_PATH = os.getenv("MODEL_PATH", "model.joblib")
_classifier: TransactionClassifier | None = None


# ── Application lifecycle ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _classifier
    _classifier = TransactionClassifier(model_path=MODEL_PATH)
    _classifier.load_or_train()
    log.info("Classifier ready — %d categories", len(_classifier.classes_))
    yield
    log.info("ML service shutting down")


app = FastAPI(
    title="FinAnalytix ML Service",
    description=(
        "Transaction text → spending category classifier. "
        "Used internally by the FinAnalytix NestJS backend."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request / response schemas ───────────────────────────────────────────────

class PredictRequest(BaseModel):
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        examples=["Java House coffee Westgate"],
        description="The transaction description or merchant name to classify.",
    )
    type: str = Field(
        default="expense",
        pattern="^(income|expense)$",
        examples=["expense"],
        description="Transaction type — income transactions map directly to 'income' slug.",
    )


class PredictResponse(BaseModel):
    category_slug: str = Field(description="Predicted category slug (e.g. 'food-dining').")
    confidence: float = Field(description="Model confidence for the top class (0.0–1.0).")
    all_scores: dict[str, float] = Field(description="Probability for every category.")


class FeedbackRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    correct_category_slug: str = Field(
        ...,
        description=f"The correct category slug. Valid values: {sorted(VALID_SLUGS)}",
    )


class HealthResponse(BaseModel):
    status: str
    model_trained: bool
    categories: list[str]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Liveness and readiness probe",
)
def health() -> HealthResponse:
    try:
        model_trained = _classifier is not None and _classifier.is_trained
        categories = _classifier.classes_ if _classifier else []
        return HealthResponse(
            status="ok",
            model_trained=model_trained,
            categories=categories,
        )
    except Exception as exc:
        log.exception("Health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )


@app.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Classify a transaction description",
    description=(
        "Returns the most likely category slug for a transaction description "
        "together with the model confidence score (0–1).\n\n"
        "Income transactions (`type=income`) are always routed to the `income` "
        "category without invoking the model."
    ),
)
def predict(body: PredictRequest) -> PredictResponse:
    if _classifier is None or not _classifier.is_trained:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classifier is not ready yet. Please retry shortly.",
        )

    # Income transactions always belong to the 'income' category
    if body.type == "income":
        return PredictResponse(
            category_slug="income",
            confidence=1.0,
            all_scores={"income": 1.0},
        )

    try:
        slug, confidence, all_scores = _classifier.predict(body.description)
    except Exception as exc:
        log.exception("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed. Please try again.",
        )

    return PredictResponse(
        category_slug=slug,
        confidence=round(confidence, 4),
        all_scores={k: round(v, 4) for k, v in all_scores.items()},
    )


@app.post(
    "/feedback",
    status_code=status.HTTP_200_OK,
    tags=["Training"],
    summary="Record a user category correction",
    description=(
        "Stores a user-provided correction so it can be incorporated the next "
        "time /retrain is called. No immediate effect on the current model."
    ),
)
def feedback(body: FeedbackRequest) -> dict:
    if _classifier is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classifier not initialised.",
        )

    if body.correct_category_slug not in VALID_SLUGS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unknown category slug '{body.correct_category_slug}'. "
                f"Valid values: {sorted(VALID_SLUGS)}"
            ),
        )

    try:
        _classifier.add_feedback(body.description, body.correct_category_slug)
    except Exception as exc:
        log.exception("Failed to record feedback: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save feedback. Please try again.",
        )

    return {"message": "Feedback recorded. Call /retrain to apply it to the model."}


@app.post(
    "/retrain",
    status_code=status.HTTP_200_OK,
    tags=["Training"],
    summary="Retrain the classifier with accumulated feedback",
    description=(
        "Merges all stored user corrections with the base training set and refits "
        "the model in-place. The updated model is persisted to disk immediately."
    ),
)
def retrain() -> dict:
    if _classifier is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classifier not initialised.",
        )

    try:
        total_samples = _classifier.retrain()
    except Exception as exc:
        log.exception("Retrain failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Retrain failed. Check server logs for details.",
        )

    return {
        "message": f"Model retrained successfully on {total_samples} total samples.",
        "categories": _classifier.classes_,
    }

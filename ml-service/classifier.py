"""TransactionClassifier
-----------------------
TF-IDF vectorisation + Logistic Regression pipeline that maps transaction
description text to a spending category slug.

Design decisions
----------------
* char_wb n-grams (2–4) handle abbreviations, typos, and partial merchant
  names common in mobile-money / POS descriptions.
* Logistic Regression (multinomial, lbfgs) gives calibrated probability
  estimates used directly as confidence scores and trains in < 1 second
  on our seed dataset.
* class_weight="balanced" handles the natural imbalance across categories.
* The fitted pipeline is persisted with joblib so the service restarts
  without retraining every time.
* A JSONL feedback file accumulates user corrections; /retrain merges them
  into the base dataset and refits.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from training_data import TRAINING_SAMPLES

log = logging.getLogger("ml-service.classifier")

FEEDBACK_PATH = os.getenv("FEEDBACK_PATH", "feedback.jsonl")
VALID_SLUGS = {
    "food-dining", "transport", "social", "entertainment",
    "utilities", "health", "education", "clothing",
    "rent-housing", "savings", "income", "other",
}


class TransactionClassifier:
    """Thin wrapper around a scikit-learn Pipeline with persistence and feedback."""

    def __init__(self, model_path: str = "model.joblib") -> None:
        self.model_path = model_path
        self.pipeline: Optional[Pipeline] = None
        self.classes_: list[str] = []
        self.is_trained: bool = False

    # ── Public API ─────────────────────────────────────────────────────────

    def load_or_train(self) -> None:
        """Load the persisted model from disk; train a fresh one if absent."""
        if os.path.exists(self.model_path):
            try:
                self.pipeline = joblib.load(self.model_path)
                self.classes_ = list(self.pipeline.classes_)
                self.is_trained = True
                log.info(
                    "Model loaded from %s (%d classes, %d features)",
                    self.model_path,
                    len(self.classes_),
                    self.pipeline.named_steps["tfidf"].get_feature_names_out().shape[0],
                )
                return
            except Exception as exc:
                log.warning("Could not load saved model (%s) — retraining.", exc)

        self._train(TRAINING_SAMPLES)

    def predict(self, description: str) -> tuple[str, float, dict[str, float]]:
        """
        Classify *description* and return (category_slug, confidence, all_scores).

        confidence is the probability for the top class (0–1).
        all_scores is a mapping of every slug to its probability.
        """
        if not self.is_trained or self.pipeline is None:
            raise RuntimeError("Classifier is not trained yet.")

        text = description.strip().lower()
        proba = self.pipeline.predict_proba([text])[0]
        classes = list(self.pipeline.classes_)
        best_idx = int(proba.argmax())
        all_scores: dict[str, float] = dict(zip(classes, proba.tolist()))
        return classes[best_idx], float(proba[best_idx]), all_scores

    def add_feedback(self, description: str, correct_slug: str) -> None:
        """Append a user correction to the feedback file."""
        try:
            entry = json.dumps({"text": description, "label": correct_slug})
            with open(FEEDBACK_PATH, "a", encoding="utf-8") as fh:
                fh.write(entry + "\n")
            log.info("Feedback recorded: '%s' → %s", description[:60], correct_slug)
        except (OSError, IOError) as exc:
            log.exception("Failed to write feedback file %s: %s", FEEDBACK_PATH, exc)
            raise

    def retrain(self) -> int:
        """
        Merge accumulated feedback with the base training set and refit.
        Returns the total number of training samples used.
        """
        try:
            samples = list(TRAINING_SAMPLES)

            if os.path.exists(FEEDBACK_PATH):
                try:
                    with open(FEEDBACK_PATH, encoding="utf-8") as fh:
                        for raw_line in fh:
                            line = raw_line.strip()
                            if not line:
                                continue
                            try:
                                entry = json.loads(line)
                                if entry.get("text") and entry.get("label") in VALID_SLUGS:
                                    samples.append((entry["text"], entry["label"]))
                            except json.JSONDecodeError:
                                log.warning("Skipping malformed feedback line: %s", raw_line[:80])
                except (OSError, IOError) as exc:
                    log.warning("Could not read feedback file %s: %s", FEEDBACK_PATH, exc)

            self._train(samples)
            return len(samples)
        except Exception as exc:
            log.exception("Retrain failed: %s", exc)
            raise

    # ── Private helpers ────────────────────────────────────────────────────

    def _train(self, samples: list[tuple[str, str]]) -> None:
        try:
            texts, labels = zip(*samples)

            self.pipeline = Pipeline([
                (
                    "tfidf",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(2, 4),
                        min_df=1,
                        max_features=30_000,
                        sublinear_tf=True,
                        strip_accents="unicode",
                        lowercase=True,
                    ),
                ),
                (
                    "clf",
                    LogisticRegression(
                        solver="lbfgs",
                        multi_class="multinomial",
                        max_iter=1_000,
                        C=5.0,
                        class_weight="balanced",
                        random_state=42,
                    ),
                ),
            ])

            self.pipeline.fit(list(texts), list(labels))
            self.classes_ = list(self.pipeline.classes_)
            self.is_trained = True

            try:
                joblib.dump(self.pipeline, self.model_path)
            except (OSError, IOError) as exc:
                log.exception("Failed to save model to %s: %s", self.model_path, exc)
                raise

            log.info(
                "Model trained on %d samples, %d classes — saved to %s",
                len(samples),
                len(self.classes_),
                self.model_path,
            )
        except Exception as exc:
            log.exception("_train failed: %s", exc)
            raise

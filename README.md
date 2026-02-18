# FinAnalytix

**Smart money management for young Kenyans.**  
Track spending, budget with AI-categorized transactions, get nudges before you overspend, and save toward goals—without the guesswork.

---

## Objective

FinAnalytix helps young Kenyans **stop wondering where their money went and start controlling it**. We aim to:

- **Track spending** with minimal friction — quick manual entry or future bank sync.
- **Budget with confidence** — AI-categorized transactions, limits per category (e.g. Food, Transport, Social), and alerts before you overspend.
- **Save toward goals** — set targets and deadlines, see progress and “on track” nudges (e.g. “Save KES X more per week to hit your goal 2 weeks early”).
- **Learn as you go** — short 5–7 minute lessons (budgeting, saving, debt) shown when they’re most relevant (e.g. after recording HELB income or creating your first goal).
- **Respect the user** — no judgment, no locking spending, no spam, no ads, no selling data. We only track and advise.

---

## Tech Stack

Built with a **frontend (Angular)**, **backend (NestJS)**, and **ML service (Python/FastAPI)** talking to a **PostgreSQL** database.

| Layer | Tech | Badges |
|-------|------|--------|
| **Frontend** | Angular, TypeScript, RxJS | ![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat-square&logo=angular&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=flat-square&logo=reactivex&logoColor=white) |
| **Backend** | NestJS, TypeScript, Prisma, JWT | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) |
| **Database** | PostgreSQL | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **ML service** | Python, FastAPI, scikit-learn | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white) |
| **DevOps** | Docker, GitHub Actions | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white) |

**Prerequisites:** Node.js 18+, Python 3.9+, PostgreSQL 14+, Git.

---

## Implementation Steps

Follow these phases in order to build FinAnalytix from scratch or add features incrementally.

### Phase 1 – Environment and repos

- Install Node.js (v18+), Python (v3.9+), PostgreSQL (v14+), and Git.
- Install Angular CLI and NestJS CLI globally:
  - `npm install -g @angular/cli`
  - `npm install -g @nestjs/cli`
- Decide structure: separate folders `frontend/`, `backend/`, `ml-service/` or a monorepo.
- Clone or create repo; document how to clone and install dependencies:
  - Frontend/backend: `npm install`
  - ML service: `pip install -r requirements.txt`

### Phase 2 – Database and backend core

- Create a PostgreSQL database and note connection URL.
- Bootstrap a NestJS application with config module and environment variables.
- Add JWT-based auth: user module, register, login, refresh token.
- Define core entities (and run migrations): **User**, **Transaction**, **Budget**, **Goal**, **Category**.
- Implement auth endpoints: register, login, refresh.

### Phase 3 – Transactions and categories

- Implement transaction APIs: create, update, delete, list with filters (date, category, type).
- Design the manual transaction entry flow (aim for ~10 seconds: amount, description, date, category).
- Add Category model and seed default categories (Food, Transport, Entertainment, Social, etc.).
- Optional: add placeholder or stub for bank sync (webhook or polling) for future use.

### Phase 4 – ML categorization service

- Build a Python service (Flask or FastAPI) that uses scikit-learn (e.g. decision tree).
- Train on merchant/description text → category; expose a POST endpoint that returns suggested category and confidence (e.g. 0–100%).
- From NestJS, call the ML service when a new transaction is created; store suggested category and confidence on the transaction.
- Add an endpoint or flow for user corrections (e.g. “this was Social, not Food”); store corrections for future training or retraining.

### Phase 5 – Budgets and alerts

- Add Budget entity: category (or overall), limit amount, period (month or semester).
- Implement CRUD for budgets and an endpoint that returns current spending vs limit per category.
- Implement logic to detect when user is near or over budget (e.g. 80%, 100%); trigger in-app alerts first, then optional push later.
- Ensure “Social” spending is tracked distinctly (e.g. category or tag) and highlighted (e.g. in purple) in the app.

### Phase 6 – Goals and savings

- Add Goal entity: name, target amount, deadline, current amount (or link to “savings” transactions).
- Implement CRUD for goals and an action to add savings (transaction or allocation) toward a goal.
- Add an endpoint for dashboard that returns progress (e.g. “75% to goal”, “on track by June”).

### Phase 7 – Frontend (Angular)

- Create Angular app with routing; add login and register pages; use HTTP interceptors to attach JWT.
- Build dashboard: summary cards (total spent, income, balance), spending by category (Chart.js or Recharts), recent transactions.
- Add transactions list and the manual add-transaction form (10-second flow).
- Add budgets UI: set limits, progress bars, and display alerts when near or over limit.
- Add goals UI: list goals, progress bars, and “add savings” action.
- Add a dedicated or filtered view for social spending (highlight in purple).
- Configure PWA: manifest and service worker so the app is installable and works offline where possible.

### Phase 8 – Nudges and education

- Implement a simple nudge engine: rules (e.g. “>80% of budget spent”, “weekend overspend pattern”) that trigger in-app messages (no spam).
- Add a content store (e.g. JSON or CMS) for short 5–7 minute financial lessons (budgeting, saving, debt, compound interest).
- Show lessons when contextually relevant (e.g. after recording “HELB” income or when user creates first goal).

### Phase 9 – Analytics and polish

- Add charts: pie (spending by category), line (spending over time), bar (income vs expenses).
- Add simple insights from aggregates: e.g. “You spend more on weekends”, “Food costs doubled this month”.
- Support multiple income sources: label transactions as income and by source (HELB, parents, part-time job, etc.) so users can see where money comes from.

### Phase 10 – Deployment

- **Frontend:** Build Angular app and deploy to Vercel or Netlify; set environment variable for API URL.
- **Backend:** Deploy NestJS to Heroku, Railway, or Render; set database URL and JWT secrets in env.
- **Database:** Use Heroku Postgres or Supabase; ensure backend connects via env.
- **ML service:** Dockerize the Python service and deploy (e.g. same host or separate container/service).
- **CI:** Use GitHub Actions to run tests (Jest for backend, optional pytest for ML) on push.

---

## Project layout

Suggested structure for a greenfield setup:

```
FinAnalytics/
├── frontend/          # Angular app
├── backend/           # NestJS API
├── ml-service/        # Python ML API (Flask/FastAPI)
└── README.md          # This file
```

Adjust if you use a monorepo or different naming.

---

## Running locally

Full stack: **PostgreSQL → Backend (NestJS) ← ML service (Python)**. The backend injects the ML service for transaction categorisation; both can run independently (without ML, transactions still save but no category suggestion).

### 1. Database

Start PostgreSQL and create a database. Set `DATABASE_URL` in `backend/.env` (copy from `backend/.env.example`).

### 2. Backend (NestJS)

```bash
cd backend
cp .env.example .env   # then fill DATABASE_URL, JWT_SECRET, and optionally ML_SERVICE_URL
npm install
npx prisma migrate deploy
npm run start:dev
```

API: `http://localhost:3000/api/v1` · Swagger: `http://localhost:3000/api/docs` · Health (backend + ML status): `http://localhost:3000/api/v1/health`

### 3. ML service (Python) — required for category suggestions

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

ML API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

Set `ML_SERVICE_URL=http://localhost:8000` in `backend/.env` so the backend calls this service when creating transactions. If the ML service is down, the backend still works; new transactions simply won’t get an auto-suggested category.

### 4. Frontend (Angular)

From `frontend/`, set the API URL (e.g. `src/environments/environment.ts`) to `http://localhost:3000/api/v1`, then run `ng serve`. Open `http://localhost:4200`.

### Run backend + ML together (from repo root)

With Node and Python available, you can start both in one go:

```bash
# Terminal 1: ML service
cd ml-service && pip install -r requirements.txt && uvicorn main:app --port 8000

# Terminal 2: Backend
cd backend && npm run start:dev
```

From the repo root you can run both in one terminal: `npm install` (installs `concurrently`), then `npm run start:stack`.

---

## What we don’t do

- Judge users for their spending.
- Lock or block spending.
- Require hours of manual data entry (tracking is automatic or quick manual add).
- Spam with notifications.
- Show ads or sell user data.
- Replace the user’s bank account (we only track and advise).

---

FinAnalytix helps you stop wondering where your money went and start controlling it.

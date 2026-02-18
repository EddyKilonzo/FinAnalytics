# FinAnalytix

**Smart money management for young Kenyans.** Track spending automatically, budget with AI-categorized transactions, get nudges before you overspend, and save toward goals—without the guesswork.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Angular, TypeScript, Angular Material / Tailwind CSS, Chart.js / Recharts, PWA |
| **Backend** | NestJS, TypeScript, JWT, TypeORM / Prisma |
| **Database** | PostgreSQL |
| **ML** | Python, scikit-learn, Flask / FastAPI |
| **Deployment** | Vercel / Netlify (frontend), Heroku / Railway / Render (backend), Heroku Postgres / Supabase (DB), Docker (ML) |

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

1. **Database:** Start PostgreSQL and create a database. Set `DATABASE_URL` (or equivalent) in backend env.
2. **Backend:** From `backend/`, copy `.env.example` to `.env`, fill in DB and JWT secret, then run `npm run start:dev`.
3. **ML service:** From `ml-service/`, create a virtualenv, `pip install -r requirements.txt`, then run the Flask/FastAPI app (e.g. `python app.py` or `uvicorn main:app`).
4. **Frontend:** From `frontend/`, set API URL in environment (e.g. `src/environments/environment.ts`), then run `ng serve`.

Open the frontend URL (e.g. `http://localhost:4200`) and ensure it talks to the backend; backend should call the ML service for categorization when configured.

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

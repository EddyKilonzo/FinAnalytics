# FinAnalytix

Smart money management platform for young Kenyans, built as a three-service system:

- `frontend/` — Angular web app
- `backend/` — NestJS API + Prisma
- `ml-service/` — FastAPI + scikit-learn transaction categorization service

This README is a full project guide for what currently exists in this repository and how each part works.

## Stack Logos

Badges are grouped by layer and managed with reference-style links so edits happen in one place.

**Frontend**  
[![Angular][badge-angular]][url-angular]
[![TypeScript][badge-typescript]][url-typescript]
[![RxJS][badge-rxjs]][url-rxjs]
[![Tailwind CSS][badge-tailwind]][url-tailwind]
[![Chart.js][badge-chartjs]][url-chartjs]

**Backend**  
[![NestJS][badge-nest]][url-nest]
[![Prisma][badge-prisma]][url-prisma]
[![PostgreSQL][badge-postgres]][url-postgres]
[![JWT][badge-jwt]][url-jwt]
[![Swagger][badge-swagger]][url-swagger]

**ML Service**  
[![Python][badge-python]][url-python]
[![FastAPI][badge-fastapi]][url-fastapi]
[![scikit-learn][badge-sklearn]][url-sklearn]
[![joblib][badge-joblib]][url-joblib]

**DevOps / Tooling**  
[![Docker][badge-docker]][url-docker]
[![GitHub Actions][badge-gh-actions]][url-gh-actions]
[![Node.js][badge-node]][url-node]

## What The Project Does

FinAnalytix helps users:

- track transactions (income + expenses),
- auto-categorize expenses using ML suggestions,
- create budgets and receive overspend alerts,
- set savings goals and allocate/withdraw progress,
- view analytics and insights,
- complete onboarding and financial lessons,
- use role-based access (user and admin flows).

## User Workflows

### Guest to authenticated user

1. User lands on `/` or `/home`.
2. User signs up at `/auth/register` or logs in at `/auth/login`.
3. Backend returns JWT; frontend stores session and routes into protected app shell.
4. User verifies email via `/verify-email` flow (link/code-based verification endpoints).
5. User can complete onboarding at `/onboarding` to personalize experience.

### Standard user daily workflow

1. User opens `/dashboard` to view spending summary and current status.
2. User adds transactions in `/transactions/add`.
3. Backend optionally asks ML service for category suggestion and confidence.
4. User reviews transactions in `/transactions`, corrects categories when needed.
5. User creates/updates budgets in `/budgets` and monitors `alerts` behavior.
6. User creates goals in `/goals`, then allocates or withdraws savings progress.
7. User checks `/analytics`, `/social`, and `/lessons` for insights and education.
8. User updates profile/avatar/password in `/profile`.

### Admin workflow

1. Admin signs in and accesses `/admin`.
2. Admin monitors platform totals and monthly statistics in admin dashboard.
3. Admin manages users, transactions, budgets, goals, categories, and lessons.
4. Admin triggers ML maintenance actions (sync feedback, retrain) from admin endpoints.

### Service-level workflow (technical)

1. Frontend sends authenticated request to backend (`/api/v1/...`).
2. Backend validates JWT/role, validates DTO, and performs DB operation.
3. For prediction-enabled transaction flows, backend calls ML service `/predict`.
4. Backend maps ML slug to category and stores confidence on transaction.
5. Response returns to frontend for rendering and user feedback.

## Current Architecture

Data flow:

1. Angular frontend calls NestJS API at `http://localhost:3000/api/v1`.
2. NestJS stores and reads data from PostgreSQL through Prisma.
3. On transaction create/update flows that need prediction, NestJS calls the ML service (`http://localhost:8000` by default).
4. ML returns `category_slug` + confidence; backend maps slug to DB category and stores suggestion fields.

The backend still works if ML is unavailable (you lose category prediction, but core CRUD remains available).

## Repository Structure

```text
FinAnalytics/
├─ README.md
├─ package.json                      # root helper scripts (start stack)
├─ backend/
│  ├─ src/                           # NestJS modules/controllers/services
│  ├─ prisma/                        # schema + migrations + seed
│  ├─ Dockerfile                     # API image
│  ├─ docker-compose.yml             # local Postgres + API
│  └─ README.md                      # backend-specific guide
├─ frontend/
│  ├─ src/
│  │  ├─ app/                        # Angular features/layout/core/shared
│  │  └─ environments/               # API URL config
│  └─ README.md                      # Angular CLI boilerplate doc
├─ ml-service/
│  ├─ main.py                        # FastAPI app
│  ├─ classifier.py                  # training/predict/retrain logic
│  ├─ training_data.py               # base labeled samples
│  ├─ requirements.txt
│  └─ Dockerfile
└─ .github/workflows/backend-tests.yml
```

## Tech Stack

- Frontend: Angular 20, TypeScript, RxJS, Tailwind, Chart.js (`ng2-charts`)
- Backend: NestJS 10, Prisma 5, PostgreSQL, Swagger/OpenAPI, JWT auth
- ML service: FastAPI, scikit-learn, joblib, pydantic
- DevOps: Docker, Docker Compose, GitHub Actions CI

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm
- Python 3.11+ recommended
- PostgreSQL 14+ (or Docker for local DB)
- Git

## Setup (Full Local Stack)

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd FinAnalytics
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../ml-service && pip install -r requirements.txt
```

Or from root, you can use:

```bash
npm run install:all
```

### 2) Configure environment variables

Create and populate `backend/.env` before starting the API.

Important variables used by this project:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | Prisma/backend | PostgreSQL connection string |
| `PORT` | backend | API port (default `3000`) |
| `CORS_ORIGIN` | backend | Allowed frontend origin |
| `JWT_SECRET` | backend | Access token signing secret |
| `JWT_EXPIRES_IN` | backend | Token lifetime (example: `7d`) |
| `ML_SERVICE_URL` | backend | URL for ML predict/feedback/retrain calls |
| `ML_TIMEOUT_MS` | backend | ML request timeout |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | backend | Email verification and mail notifications |
| `BACKEND_URL`, `FRONTEND_VERIFY_EMAIL_URL` | backend | Links used in verification emails |
| `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | backend | Profile image upload |
| `GOOGLE_CLIENT_ID` | backend | Google auth integration (if enabled) |
| `ANTHROPIC_API_KEY` | backend | AI-assisted lesson draft endpoints |
| `MODEL_PATH`, `FEEDBACK_PATH`, `CORS_ORIGINS` | ml-service | ML model location, feedback storage, CORS |

Frontend API URL is configured in:

- `frontend/src/environments/environment.ts` (local)
- `frontend/src/environments/environment.prod.ts` (production build)

### 3) Start PostgreSQL

Option A: local Postgres instance (manual).

Option B: Docker Compose from `backend/`:

```bash
cd backend
docker compose up -d db
```

### 4) Run database migrations

```bash
cd backend
npx prisma migrate deploy
```

For development schema updates:

```bash
npm run db:migrate
```

Optional seed:

```bash
npm run db:seed
```

### 5) Start services

ML service:

```bash
cd ml-service
uvicorn main:app --reload --port 8000
```

Backend API:

```bash
cd backend
npm run start:dev
```

Frontend:

```bash
cd frontend
npm start
```

### 6) Open local URLs

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000/api/v1`
- Backend Swagger docs: `http://localhost:3000/api/docs`
- Backend health: `http://localhost:3000/api/v1/health`
- ML docs: `http://localhost:8000/docs`

## Quick Start Commands

From repository root:

- `npm run start:ml` — start ML service
- `npm run start:backend` — start NestJS API
- `npm run start:stack` — start backend + ML concurrently
- `npm run tech:stack` — alias for `start:stack`

From `backend/`:

- `npm run start:dev`, `npm run start:prod`
- `npm run lint`
- `npm run test`, `npm run test:cov`, `npm run test:e2e`
- `npm run db:migrate`, `npm run db:push`, `npm run db:studio`, `npm run db:seed`

From `frontend/`:

- `npm start`
- `npm run build`
- `npm test`

## Backend Modules and API Surface

All API routes are prefixed with `/api/v1` (except Swagger at `/api/docs`).

### Core modules

- `auth` — signup/login/email verification, onboarding completion, current user
- `users` + `profile` — user CRUD/admin controls + self-profile updates/password/avatar
- `transactions` — list/filter/create/update/delete, summary, by-category stats, CSV export, category correction
- `budgets` — CRUD + active budget alerts
- `goals` — CRUD + allocation/withdraw + dashboard aggregation
- `categories` — CRUD + seed defaults
- `analytics` — insights endpoint
- `lessons` — catalog, suggested lessons, progress, completion, leaderboard, admin CRUD, AI draft/approve/reject flows
- `admin` — admin dashboard, monthly stats, system-wide records, ML sync/retrain actions
- `health` — backend + ML readiness probe

### Security and runtime behavior

- Global request rate limiting via `@nestjs/throttler` (with stricter login limits).
- JWT bearer authentication and role guards.
- ValidationPipe with whitelist + transform.
- Helmet enabled (excluding Swagger UI route).
- Global exception filter and logging interceptor.

## Database Schema (Prisma)

Main models:

- `User` (role, onboarding fields, suspension state, auth verification state)
- `Category` (name, slug, color)
- `Transaction` (amount, type, date, optional category, ML suggestion + confidence, income source)
- `Budget` (period window, optional category-scoped limit)
- `Goal` (target/current amount, deadline)
- `MlFeedback` (user correction history)
- `UserLessonProgress` (lesson completion and score metadata)

Enums:

- `Role`: `USER`, `ADMIN`
- `UserType`: `FORM_FOUR_STUDENT`, `UNIVERSITY_STUDENT`, `RECENT_GRADUATE`, `YOUNG_PROFESSIONAL`

## Frontend Features and Routing

Implemented route groups include:

- Public/guest: `/`, `/home`, `/auth/login`, `/auth/register`, `/verify-email`
- User app: `/dashboard`, `/analytics`, `/transactions`, `/budgets`, `/goals`, `/categories`, `/lessons`, `/social`, `/profile`
- Admin app: `/admin` and nested admin resources
- Onboarding: `/onboarding` (authenticated)

Guards used:

- `authGuard`, `guestGuard`, `userOnlyGuard`, `adminGuard`

UI structure:

- `layout/` contains shell/minimal/auth layouts
- `features/` contains domain screens
- `core/` contains auth/services/guards/utilities
- `shared/` contains reusable components (navbar, toast, footer, etc.)

## ML Service Details

Service endpoints:

- `GET /health`
- `POST /predict`
- `POST /feedback`
- `POST /retrain`

Model implementation (`classifier.py`):

- `TfidfVectorizer` (char n-grams) + `LogisticRegression`
- persisted with `joblib` at `MODEL_PATH`
- user corrections appended to JSONL (`FEEDBACK_PATH`)
- `/retrain` merges base samples + feedback and saves a refreshed model

Special behavior:

- `type=income` predicts `income` directly without model inference.

## Docker and Containers

### Backend container

- `backend/Dockerfile` builds NestJS app and runs:
  - `npx prisma migrate deploy`
  - `node dist/main.js`

### Local compose stack

`backend/docker-compose.yml` provides:

- `db` (Postgres 16)
- `api` (NestJS service built from local backend)

ML service is not part of this compose file by default; run it separately or add your own compose service.

### ML container

`ml-service/Dockerfile`:

- installs Python dependencies in a virtual environment,
- pre-trains model at build time,
- runs Uvicorn on port `8000` with 2 workers.

## Testing and CI

GitHub workflow: `.github/workflows/backend-tests.yml`

On push/PR affecting backend:

1. `lint-and-unit` job:
   - install dependencies
   - `prisma generate`
   - `npm run lint`
   - `npm run test:cov`
2. `e2e` job:
   - starts PostgreSQL service
   - runs Prisma migrations
   - runs `npm run test:e2e`

## Deployment Notes

- Set strong production secrets (`JWT_SECRET`, DB credentials, API keys).
- Restrict `CORS_ORIGIN` to your deployed frontend URL.
- Use `prisma migrate deploy` for production schema rollout.
- Keep `.env` files out of version control and use a template file for safe sharing.
- Set `frontend/src/environments/environment.prod.ts` `apiUrl` during deployment.

## Troubleshooting

- API starts but requests fail DB operations:
  - verify `DATABASE_URL`, DB availability, and migration status.
- Transactions save but no category suggestion:
  - verify `ML_SERVICE_URL`, ML service running state, and `/health`.
- Frontend auth loops:
  - verify JWT secret consistency and correct frontend `apiUrl`.
- Email verification links broken:
  - verify `BACKEND_URL` and `FRONTEND_VERIFY_EMAIL_URL`.

## Known Improvement Opportunities

- Add committed `backend/.env.example` and `ml-service/.env.example` templates.
- Add a root one-command bootstrap script for DB + API + ML + frontend.
- Add frontend E2E test coverage.
- Add repository-level API endpoint reference table generated from Swagger.

<!-- Badge/link management: keep all badge definitions centralized below -->
[badge-angular]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[badge-typescript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[badge-rxjs]: https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white
[badge-tailwind]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[badge-chartjs]: https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white
[badge-nest]: https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white
[badge-prisma]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[badge-postgres]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[badge-jwt]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white
[badge-swagger]: https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=111111
[badge-python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[badge-fastapi]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[badge-sklearn]: https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white
[badge-joblib]: https://img.shields.io/badge/joblib-4B8BBE?style=for-the-badge
[badge-docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[badge-gh-actions]: https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white
[badge-node]: https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white
[url-angular]: https://angular.dev/
[url-typescript]: https://www.typescriptlang.org/
[url-rxjs]: https://rxjs.dev/
[url-tailwind]: https://tailwindcss.com/
[url-chartjs]: https://www.chartjs.org/
[url-nest]: https://nestjs.com/
[url-prisma]: https://www.prisma.io/
[url-postgres]: https://www.postgresql.org/
[url-jwt]: https://jwt.io/
[url-swagger]: https://swagger.io/
[url-python]: https://www.python.org/
[url-fastapi]: https://fastapi.tiangolo.com/
[url-sklearn]: https://scikit-learn.org/
[url-joblib]: https://joblib.readthedocs.io/
[url-docker]: https://www.docker.com/
[url-gh-actions]: https://github.com/features/actions
[url-node]: https://nodejs.org/

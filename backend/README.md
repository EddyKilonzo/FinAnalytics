# FinAnalytics Backend

NestJS API for FinAnalytics — budgeting, goals, transactions, and lessons for young Kenyans.

## Stack

- **NestJS 10** — API framework  
- **Prisma** — PostgreSQL ORM  
- **Swagger** — OpenAPI docs at `/api/docs`  
- **JWT** — auth; **Throttler** + **Helmet** — security  
- **Python ML service** — optional transaction categorisation (see `ml-service/`)

## Setup

1. **Node** 18+ and **pnpm**/npm.
2. **PostgreSQL** running (local or cloud).
3. **Env**

   ```bash
   cp .env.example .env
   # Edit .env: set DATABASE_URL, JWT_SECRET, and any optional vars (mailer, Cloudinary, ML).
   ```

4. **Install and DB**

   ```bash
   npm install
   npx prisma migrate dev    # or db:push for dev
   npm run db:seed           # optional
   ```

5. **Run**

   ```bash
   npm run start:dev
   ```

   - API: `http://localhost:3000/api/v1`  
   - Swagger: `http://localhost:3000/api/docs`  
   - Health: `http://localhost:3000/api/v1/health`

   For full stack (API + ML): `npm run start:stack`.

## Scripts

| Script         | Description                |
|----------------|----------------------------|
| `start:dev`    | API with watch             |
| `start:prod`   | Production build run       |
| `start:stack`  | API + ML service           |
| `db:migrate`   | Prisma migrate dev         |
| `db:push`      | Prisma db push             |
| `db:studio`    | Prisma Studio              |
| `db:seed`      | Run seed                   |
| `test`         | Unit tests                 |
| `test:cov`     | Unit tests + coverage      |
| `test:e2e`     | E2E tests (needs DB + env) |
| `lint`         | ESLint with fix            |
| `format`       | Prettier                   |

## E2E tests

E2E tests boot the full app and hit real endpoints. They expect:

- `DATABASE_URL` in `.env` (DB must be reachable)
- Optional: ML service for tests that depend on it

Run: `npm run test:e2e`

## CI

On push/PR to `main`, `master`, or `develop` (when `backend/**` or the workflow file changes), GitHub Actions runs:

- **lint-and-unit**: `npm run lint`, then `npm run test:cov`
- **e2e**: Starts PostgreSQL, runs migrations, then `npm run test:e2e` with a test DB

Workflow file: `../.github/workflows/backend-tests.yml`.

## Docker

- **API + DB (production-like)**

  ```bash
  docker compose up -d
  ```

  - DB: `postgresql://finanalytics:finanalytics@localhost:5432/finanalytics`
  - API: http://localhost:3000 (runs `prisma migrate deploy` then starts the server)
  - Set `JWT_SECRET` and other env in `docker-compose.yml` or via env file for production.

- **Build image only** (e.g. for a separate orchestrator):

  ```bash
  docker build -t finanalytics-api .
  ```

  Run with `DATABASE_URL` and `JWT_SECRET` set; run migrations before or in entrypoint as needed.

## Deploy checklist

- Use a strong `JWT_SECRET` (32+ chars) and never commit it.
- Set `CORS_ORIGIN` to your frontend origin.
- Prefer `prisma migrate deploy` for schema updates in production.
- Keep `.env` out of version control; use `.env.example` as the template.

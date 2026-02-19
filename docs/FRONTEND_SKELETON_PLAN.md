# FinAnalytics Frontend — Skeleton Plan

Plan for building the **Angular frontend skeleton** only (no visual design yet). Aligns with the existing NestJS backend at `http://localhost:3000/api/v1` and the README Phase 7 scope.

---

## 1. Current state

- **Location:** `frontend/` (Angular 20, standalone components).
- **Existing:** Default Angular welcome template, empty `app.routes.ts`, no API integration.
- **Backend base:** `/api/v1` with modules: auth, users, categories, transactions, budgets, goals, lessons, analytics, admin, health.

---

## 2. Folder structure (skeleton)

```
frontend/src/
├── app/
│   ├── app.ts              # Root component (keep shell only)
│   ├── app.html             # <router-outlet /> + optional shell
│   ├── app.config.ts        # Add HttpClient, interceptors
│   ├── app.routes.ts        # All routes + guards
│   │
│   ├── core/                # Singletons, app-wide
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   └── auth.interceptor.ts   # Attach JWT
│   │   ├── api/
│   │   │   └── api.service.ts       # Base URL, optional generic HTTP helpers
│   │   └── constants/
│   │       └── index.ts             # Route paths, API paths
│   │
│   ├── layout/              # Shell only — no design
│   │   ├── shell/
│   │   │   ├── shell.component.ts
│   │   │   └── shell.html            # Header placeholder, <router-outlet />
│   │   └── minimal/                 # For login/register (no nav)
│   │       └── minimal-layout.component.ts
│   │
│   ├── shared/              # Reusable, feature-agnostic
│   │   ├── pipes/
│   │   ├── directives/
│   │   └── components/              # Placeholder only if needed for skeleton
│   │
│   └── features/            # One folder per feature area
│       ├── auth/
│       │   ├── login/
│       │   │   └── login.component.ts
│       │   ├── register/
│       │   │   └── register.component.ts
│       │   └── verify-email/
│       │       └── verify-email.component.ts
│       ├── dashboard/
│       │   └── dashboard.component.ts
│       ├── transactions/
│       │   ├── list/
│       │   │   └── transaction-list.component.ts
│       │   └── add/
│       │       └── add-transaction.component.ts
│       ├── budgets/
│       │   ├── list/
│       │   │   └── budget-list.component.ts
│       │   └── detail/              # Optional for skeleton
│       │       └── budget-detail.component.ts
│       ├── goals/
│       │   ├── list/
│       │   │   └── goal-list.component.ts
│       │   └── detail/
│       │       └── goal-detail.component.ts
│       ├── categories/
│       │   └── category-list.component.ts   # Optional: admin/categories
│       ├── lessons/
│       │   ├── list/
│       │   │   └── lesson-list.component.ts
│       │   └── view/
│       │       └── lesson-view.component.ts
│       ├── analytics/
│       │   └── analytics.component.ts
│       └── social-spending/         # Dedicated view per README
│           └── social-spending.component.ts
│
├── environments/
│   ├── environment.ts              # development: apiUrl
│   └── environment.prod.ts         # production: apiUrl
│
└── styles.css                      # Global; keep minimal for skeleton
```

- **core:** Auth service (login/logout/tokens), JWT interceptor, auth guard, API base.
- **layout:** Shell (nav placeholder + outlet) and minimal layout for auth pages.
- **shared:** Empty or minimal (e.g. one pipe) for now.
- **features:** One component per screen; templates are placeholders (title + “Content here” or simple list div).

---

## 3. Routing (skeleton)

| Path | Component | Guard | Layout |
|------|-----------|--------|--------|
| `''` | redirect → `/dashboard` | AuthGuard | Shell |
| `login` | Login | — | Minimal |
| `register` | Register | — | Minimal |
| `verify-email` | VerifyEmail | — | Minimal |
| `dashboard` | Dashboard | AuthGuard | Shell |
| `transactions` | TransactionList | AuthGuard | Shell |
| `transactions/add` | AddTransaction | AuthGuard | Shell |
| `budgets` | BudgetList | AuthGuard | Shell |
| `budgets/:id` | BudgetDetail | AuthGuard | Shell |
| `goals` | GoalList | AuthGuard | Shell |
| `goals/:id` | GoalDetail | AuthGuard | Shell |
| `categories` | CategoryList | AuthGuard | Shell |
| `lessons` | LessonList | AuthGuard | Shell |
| `lessons/:id` | LessonView | AuthGuard | Shell |
| `analytics` | Analytics | AuthGuard | Shell |
| `social` | SocialSpending | AuthGuard | Shell |
| `**` | NotFound (optional) | — | Minimal |

- **AuthGuard:** If no valid token/session, redirect to `login` (and optionally store `returnUrl`).
- **Shell:** Wraps all authenticated routes; one placeholder header with app name and nav links (no design).

---

## 4. Core pieces (implementation order)

1. **Environments**  
   - `environment.ts` and `environment.prod.ts` with `apiUrl: 'http://localhost:3000/api/v1'` (and prod URL later).

2. **HTTP & API**  
   - Register `provideHttpClient()` in `app.config.ts`.  
   - Optional: `ApiService` or a simple `BASE_URL` injectable for `apiUrl`.

3. **Auth service**  
   - Methods: `login(credentials)`, `register(payload)`, `logout()`, `refreshToken()`, `getAccessToken()`, `isLoggedIn()`.  
   - Store tokens (e.g. `localStorage` or in-memory; no design).  
   - Call backend `POST /auth/login`, `POST /auth/signup`, etc., and persist tokens.

4. **JWT interceptor**  
   - Append `Authorization: Bearer <token>` to requests to the API base URL.  
   - Optionally trigger refresh on 401 and retry (can be Phase 2).

5. **Auth guard**  
   - Use AuthService to check `isLoggedIn()`; if false, navigate to `/login` and set `returnUrl` in query or state.

6. **Layout components**  
   - **Shell:** Placeholder header (e.g. “FinAnalytix”), placeholder nav links to dashboard, transactions, budgets, goals, lessons, analytics, social. One `<router-outlet />`.  
   - **Minimal layout:** Only `<router-outlet />` (for login, register, verify-email).

7. **Route structure**  
   - Define routes in `app.routes.ts` with `path`, `component`, `canActivate: [AuthGuard]` where needed.  
   - Use `path: ''` with `redirectTo: 'dashboard'`, `pathMatch: 'full'`.  
   - Lazy-load feature modules later if desired; for skeleton, direct component imports are fine.

8. **Feature components (skeleton only)**  
   - Each feature component: minimal TS (title or empty), template with a heading and “Content placeholder” (or a simple list container).  
   - No forms, no real API calls in components yet; optional: inject `ApiService`/`HttpClient` and leave a commented example for later.

9. **App root**  
   - `app.html`: either only `<router-outlet />` or a single wrapper that chooses layout by route (e.g. by checking if route is under `login`/`register`/`verify-email`). Alternatively, assign layout via parent route (see below).

10. **Layout via parent routes**  
    - Two parent routes: one with `Shell` (and `AuthGuard`), one with `MinimalLayout`.  
    - Children under each parent get the same layout. This keeps the skeleton simple and ready for design later.

---

## 5. Implementation checklist (skeleton only)

- [ ] Add `environments` and `apiUrl`.
- [ ] Add `provideHttpClient()` and optional `ApiService` / base URL.
- [ ] Implement `AuthService` (login, register, logout, tokens, isLoggedIn).
- [ ] Implement JWT interceptor and register it.
- [ ] Implement `AuthGuard` and wire to routes.
- [ ] Create `Shell` component (placeholder header + nav + outlet).
- [ ] Create `MinimalLayout` component (outlet only).
- [ ] Define all routes with layout and guards; root redirect to `dashboard`.
- [ ] Create placeholder feature components (auth: login, register, verify-email; dashboard; transactions list/add; budgets list/detail; goals list/detail; categories; lessons list/view; analytics; social-spending).
- [ ] Remove default Angular welcome content from `app.html` / `app.ts`; keep only shell/outlet logic.
- [ ] Ensure `ng serve` runs and navigation between placeholder pages works (no design required).

---

## 6. Out of scope for skeleton

- Styling/theming and visual design.
- Real forms, validation, and API calls in feature components.
- PWA (manifest, service worker).
- Charts, tables, or detailed UI.
- i18n or accessibility beyond basic semantics.

---

## 7. Suggested order of work

1. Environments + HTTP + API base.  
2. Auth service + JWT interceptor + Auth guard.  
3. Layout: Shell and Minimal; wire in routes.  
4. Auth feature placeholders (login, register, verify-email).  
5. Dashboard placeholder.  
6. Remaining feature placeholders (transactions, budgets, goals, categories, lessons, analytics, social).  
7. Root redirect and 404 if desired.  
8. Remove default Angular template; verify navigation and guard behavior.

This gives a navigable skeleton aligned with the backend and README, ready for design and real UI in a later phase.

import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { LandingComponent } from './features/home/landing.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ── Exact root: landing for guests (navbar + footer) ──────────────────────
  {
    path: '',
    pathMatch: 'full',
    component: ShellComponent,
    canActivate: [guestGuard],
    children: [{ path: '', component: LandingComponent }],
  },

  // ── Authenticated app shell (sidebar + topbar) – must be before other '' so /dashboard, /analytics match ──────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layout/minimal-layout/minimal-layout.component').then(
        (m) => m.MinimalLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'transactions',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/transactions/list/transaction-list.component').then(
                (m) => m.TransactionListComponent,
              ),
          },
          {
            path: 'add',
            loadComponent: () =>
              import('./features/transactions/add/add-transaction.component').then(
                (m) => m.AddTransactionComponent,
              ),
          },
        ],
      },
      {
        path: 'budgets',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/budgets/list/budget-list.component').then(
                (m) => m.BudgetListComponent,
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/budgets/create/budget-create.component').then(
                (m) => m.BudgetCreateComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/budgets/detail/budget-detail.component').then(
                (m) => m.BudgetDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'goals',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/goals/list/goal-list.component').then((m) => m.GoalListComponent),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/goals/create/goal-create.component').then(
                (m) => m.GoalCreateComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/goals/detail/goal-detail.component').then(
                (m) => m.GoalDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/category-list.component').then(
            (m) => m.CategoryListComponent,
          ),
      },
      {
        path: 'lessons',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/lessons/list/lesson-list.component').then(
                (m) => m.LessonListComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/lessons/view/lesson-view.component').then(
                (m) => m.LessonViewComponent,
              ),
          },
        ],
      },
      {
        path: 'social',
        loadComponent: () =>
          import('./features/social-spending/social-spending.component').then(
            (m) => m.SocialSpendingComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/users/profile/profile.component').then((m) => m.ProfileComponent),
      },

      // ── Admin section ────────────────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/dashboard/admin-dashboard.component').then(
                (m) => m.AdminDashboardComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/users/admin-users.component').then(
                (m) => m.AdminUsersComponent,
              ),
          },
          {
            path: 'transactions',
            loadComponent: () =>
              import('./features/admin/transactions/admin-transactions.component').then(
                (m) => m.AdminTransactionsComponent,
              ),
          },
          {
            path: 'budgets',
            loadComponent: () =>
              import('./features/admin/budgets/admin-budgets.component').then(
                (m) => m.AdminBudgetsComponent,
              ),
          },
          {
            path: 'goals',
            loadComponent: () =>
              import('./features/admin/goals/admin-goals.component').then(
                (m) => m.AdminGoalsComponent,
              ),
          },
        ],
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Public shell (navbar + footer) for auth and onboarding ──────────────────────────────────────
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'auth',
        component: AuthLayoutComponent,
        canActivate: [guestGuard],
        children: [
          {
            path: 'login',
            loadComponent: () =>
              import('./features/auth/login/login.component').then((m) => m.LoginComponent),
          },
          {
            path: 'register',
            loadComponent: () =>
              import('./features/auth/register/register.component').then(
                (m) => m.RegisterComponent,
              ),
          },
          { path: '', redirectTo: 'login', pathMatch: 'full' },
        ],
      },
      {
        path: 'onboarding',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
      },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];

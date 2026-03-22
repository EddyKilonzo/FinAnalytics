import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideWallet,
  lucideUtensils,
  lucideHome,
  lucideCar,
  lucideTrendingUp,
  lucideAlertTriangle,
  lucideCheckCircle2,
  lucideShoppingBag,
  lucideZap,
  lucideLoader2,
} from '@ng-icons/lucide';
import { BudgetService } from '../../../core/services/budget.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

interface BudgetRow {
  id: string;
  name: string;
  spent: number;
  total: number;
  icon: string;
  color: string;
  pct: number;          // % of this budget used
  share: number;        // % share of total allocation
  status: 'ok' | 'warn' | 'over';
}

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, CurrencyFormatPipe],
  viewProviders: [
    provideIcons({
      lucidePlus, lucideWallet, lucideUtensils, lucideHome, lucideCar,
      lucideTrendingUp, lucideAlertTriangle, lucideCheckCircle2,
      lucideShoppingBag, lucideZap, lucideLoader2,
    })
  ],
  template: `
    <div class="budgets-wrap">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <header class="budgets-header">
        <div>
          <h1 class="page-title">Budgets</h1>
          <p class="page-subtitle">Track and manage your spending limits across categories.</p>
        </div>
        <a routerLink="create" class="btn-create">
          <ng-icon name="lucidePlus" size="18"></ng-icon>
          New Budget
        </a>
      </header>

      <!-- ── Loading ────────────────────────────────────────────── -->
      @if (isLoading) {
        <div class="loading-state">
          <ng-icon name="lucideLoader2" class="spin"></ng-icon>
          <p>Loading budgets…</p>
        </div>
      }

      <!-- ── Empty ──────────────────────────────────────────────── -->
      @if (!isLoading && budgets.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <ng-icon name="lucideWallet" size="40"></ng-icon>
          </div>
          <h3>No budgets yet</h3>
          <p>Create your first budget to start tracking spending by category.</p>
          <a routerLink="create" class="btn-create" style="margin-top:1.25rem">
            <ng-icon name="lucidePlus" size="18"></ng-icon>
            New Budget
          </a>
        </div>
      }

      @if (!isLoading && budgets.length > 0) {

        <!-- ── Allocation overview card ─────────────────────────── -->
        <div class="overview-card">

          <div class="overview-stats">
            <div class="ov-stat">
              <span class="ov-label">Total Budgeted</span>
              <span class="ov-value">{{ totalBudgeted | fmt }}</span>
            </div>
            <div class="ov-divider"></div>
            <div class="ov-stat">
              <span class="ov-label">Total Spent</span>
              <span class="ov-value accent">{{ totalSpent | fmt }}</span>
            </div>
            <div class="ov-divider"></div>
            <div class="ov-stat">
              <span class="ov-label">Remaining</span>
              <span class="ov-value" [class.danger]="totalSpent > totalBudgeted">
                {{ (totalBudgeted - totalSpent) | fmt }}
              </span>
            </div>
            <div class="ov-divider"></div>
            <div class="ov-stat">
              <span class="ov-label">Categories</span>
              <span class="ov-value">{{ budgets.length }}</span>
            </div>
          </div>

          <!-- Overall progress bar -->
          <div class="ov-progress-wrap">
            <div class="ov-progress-track">
              <div class="ov-progress-fill"
                   [style.width.%]="overallPct"
                   [ngClass]="overallPct >= 100 ? 'fill-red' : overallPct > 80 ? 'fill-amber' : 'fill-green'">
              </div>
            </div>
            <span class="ov-pct-label">
              {{ overallPct | number:'1.0-0' }}% of total budget used
              @if (overBudgetCount > 0) {
                &nbsp;·&nbsp;
                <span class="warn-badge">
                  <ng-icon name="lucideAlertTriangle" size="12"></ng-icon>
                  {{ overBudgetCount }} over limit
                </span>
              }
            </span>
          </div>

          <!-- Allocation breakdown bars -->
          <div class="allocation-section">
            <p class="allocation-title">Budget Allocation by Category</p>
            <div class="allocation-list">
              @for (b of budgets; track b.id) {
                <div class="alloc-row" [routerLink]="[b.id]">
                  <div class="alloc-icon" [style.background]="b.color + '22'" [style.color]="b.color">
                    <ng-icon [name]="b.icon" size="14"></ng-icon>
                  </div>
                  <div class="alloc-info">
                    <div class="alloc-meta">
                      <span class="alloc-name">{{ b.name }}</span>
                      <span class="alloc-amounts">
                        {{ b.spent | fmt }}
                        <span class="alloc-of">of</span>
                        {{ b.total | fmt }}
                      </span>
                    </div>
                    <!-- two-layer bar: share of total (bg) + spent within budget (fg) -->
                    <div class="alloc-bar-track">
                      <div class="alloc-bar-share" [style.width.%]="b.share"></div>
                      <div class="alloc-bar-spent"
                           [style.width.%]="b.share * (b.pct / 100)"
                           [ngClass]="b.pct >= 100 ? 'fill-red' : b.pct > 80 ? 'fill-amber' : 'fill-green'">
                      </div>
                    </div>
                  </div>
                  <div class="alloc-pct" [ngClass]="b.status">
                    {{ b.pct | number:'1.0-0' }}%
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ── Budget cards grid ───────────────────────────────── -->
        <div class="budget-grid">
          @for (budget of budgets; track budget.id; let i = $index) {
            <div [routerLink]="[budget.id]"
                 class="budget-card"
                 [style.animation-delay]="i * 0.07 + 's'">

              <!-- Status strip at top -->
              <div class="card-strip"
                   [ngClass]="budget.pct >= 100 ? 'strip-red' : budget.pct > 80 ? 'strip-amber' : 'strip-green'">
              </div>

              <div class="card-body">
                <div class="card-top">
                  <div class="card-icon"
                       [style.background]="budget.color + '22'"
                       [style.color]="budget.color">
                    <ng-icon [name]="budget.icon" size="22"></ng-icon>
                  </div>
                  <div class="card-remaining-wrap">
                    <span class="card-remaining-label">Remaining</span>
                    <span class="card-remaining"
                          [class.over]="(budget.total - budget.spent) < 0">
                      {{ (budget.total - budget.spent) | fmt }}
                    </span>
                  </div>
                </div>

                <div class="card-name">{{ budget.name }}</div>
                <div class="card-sub">
                  <span class="spent-amt">{{ budget.spent | fmt }}</span>
                  <span class="of-label"> of </span>
                  {{ budget.total | fmt }}
                </div>

                <div class="card-progress-track">
                  <div class="card-progress-fill"
                       [ngClass]="budget.pct >= 100 ? 'fill-red' : budget.pct > 80 ? 'fill-amber' : 'fill-green'"
                       [style.width.%]="budget.pct">
                  </div>
                </div>

                <div class="card-footer">
                  <span class="card-pct">{{ budget.pct | number:'1.0-0' }}% used</span>
                  @if (budget.status === 'over') {
                    <span class="status-badge red">
                      <ng-icon name="lucideAlertTriangle" size="11"></ng-icon>
                      Over budget
                    </span>
                  } @else if (budget.status === 'warn') {
                    <span class="status-badge amber">
                      <ng-icon name="lucideAlertTriangle" size="11"></ng-icon>
                      Near limit
                    </span>
                  } @else {
                    <span class="status-badge green">
                      <ng-icon name="lucideCheckCircle2" size="11"></ng-icon>
                      On track
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>

      }
    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────────────── */
    .budgets-wrap { max-width: 1100px; margin: 0 auto; padding: 2.5rem 2rem; }

    .budgets-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.03em;
    }

    /* ── Buttons ─────────────────────────────────────────────────── */
    .btn-create {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.4rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      background: var(--accent);
      color: #fff;
      border: none;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(34,197,94,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34,197,94,0.4); }

    /* ── Loading / Empty ─────────────────────────────────────────── */
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem 2rem;
      color: var(--text-primary);
      opacity: 0.6;
      gap: 0.75rem;
    }
    .empty-state { opacity: 1; }
    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent-dim);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
    .empty-state h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .empty-state p { font-size: 0.95rem; color: var(--text-primary); opacity: 0.6; margin: 0; text-align: center; }
    .spin { font-size: 2rem; color: var(--accent); animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Overview card ───────────────────────────────────────────── */
    .overview-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 1.75rem 2rem;
      margin-bottom: 2rem;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }

    .overview-stats {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .ov-stat { flex: 1; min-width: 110px; padding: 0 1rem; }
    .ov-stat:first-child { padding-left: 0; }
    .ov-divider { width: 1px; height: 40px; background: var(--border-subtle); flex-shrink: 0; }
    .ov-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-primary);
      opacity: 0.5;
      margin-bottom: 0.3rem;
    }
    .ov-value {
      display: block;
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .ov-value.accent { color: var(--accent); }
    .ov-value.danger { color: #f87171; }

    /* Overall progress */
    .ov-progress-wrap { margin-bottom: 1.75rem; }
    .ov-progress-track {
      height: 8px;
      background: var(--surface-alt);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .ov-progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
    }
    .ov-pct-label {
      font-size: 0.8rem;
      color: var(--text-primary);
      opacity: 0.55;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .warn-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #f59e0b;
      font-weight: 600;
    }

    /* Allocation breakdown */
    .allocation-section { border-top: 1px solid var(--border-subtle); padding-top: 1.5rem; }
    .allocation-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-primary);
      opacity: 0.45;
      margin: 0 0 1rem 0;
    }
    .allocation-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .alloc-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      cursor: pointer;
      padding: 0.5rem 0.625rem;
      border-radius: 10px;
      transition: background 0.15s;
    }
    .alloc-row:hover { background: var(--surface-alt); }

    .alloc-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .alloc-info { flex: 1; min-width: 0; }
    .alloc-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.3rem;
    }
    .alloc-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .alloc-amounts {
      font-size: 0.78rem;
      color: var(--text-primary);
      opacity: 0.55;
      white-space: nowrap;
      margin-left: 0.5rem;
    }
    .alloc-of { opacity: 0.6; }

    /* Two-layer bar */
    .alloc-bar-track {
      height: 5px;
      background: var(--surface-alt);
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }
    .alloc-bar-share {
      position: absolute;
      inset: 0 auto 0 0;
      background: var(--border-medium);
      border-radius: 999px;
    }
    .alloc-bar-spent {
      position: absolute;
      inset: 0 auto 0 0;
      border-radius: 999px;
      transition: width 0.7s cubic-bezier(0.16,1,0.3,1);
    }

    .alloc-pct {
      font-size: 0.8rem;
      font-weight: 700;
      min-width: 38px;
      text-align: right;
      color: var(--text-primary);
      opacity: 0.6;
    }
    .alloc-pct.warn { color: #f59e0b; opacity: 1; }
    .alloc-pct.over { color: #f87171; opacity: 1; }
    .alloc-pct.ok { color: var(--accent); opacity: 1; }

    /* ── Budget card grid ────────────────────────────────────────── */
    .budget-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .budget-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.3s;
      opacity: 0;
      animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    .budget-card:hover {
      transform: translateY(-5px);
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }
    @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

    /* Status strip */
    .card-strip { height: 4px; width: 100%; }
    .strip-green { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .strip-amber { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .strip-red   { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .card-body { padding: 1.25rem 1.5rem 1.5rem; }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-remaining-wrap { text-align: right; }
    .card-remaining-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-primary);
      opacity: 0.45;
      margin-bottom: 0.15rem;
    }
    .card-remaining {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.02em;
    }
    .card-remaining.over { color: #f87171; }

    .card-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.2rem;
    }
    .card-sub {
      font-size: 0.82rem;
      color: var(--text-primary);
      opacity: 0.55;
      margin-bottom: 1rem;
    }
    .spent-amt { font-weight: 700; color: var(--text-primary); opacity: 0.85; }
    .of-label { opacity: 0.6; }

    .card-progress-track {
      height: 6px;
      background: var(--surface-alt);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.875rem;
    }
    .card-progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-pct {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-primary);
      opacity: 0.5;
    }

    /* Shared fill colors */
    .fill-green { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .fill-amber { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .fill-red   { background: linear-gradient(90deg, #ef4444, #dc2626); }

    /* Status badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
    }
    .status-badge.green { background: rgba(34,197,94,0.12); color: #22c55e; }
    .status-badge.amber { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .status-badge.red   { background: rgba(239,68,68,0.12);  color: #f87171; }

    @media (max-width: 600px) {
      .budgets-wrap { padding: 1.5rem 1rem; }
      .overview-stats { gap: 0.75rem; }
      .ov-stat { min-width: 80px; padding: 0 0.5rem; }
      .ov-value { font-size: 1.15rem; }
    }
  `]
})
export class BudgetListComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private toast = inject(ToastService);

  budgets: BudgetRow[] = [];
  isLoading = true;

  totalBudgeted = 0;
  totalSpent = 0;
  overallPct = 0;
  overBudgetCount = 0;

  ngOnInit(): void {
    this.fetchBudgets();
  }

  fetchBudgets(): void {
    this.isLoading = true;
    this.budgetService.getBudgets().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const raw: any[] = response.data;

          this.totalBudgeted = raw.reduce((s, b) => s + (b.limitAmount || 0), 0);
          this.totalSpent    = raw.reduce((s, b) => s + (b.totalSpent  || 0), 0);
          this.overallPct    = this.totalBudgeted > 0
            ? Math.min((this.totalSpent / this.totalBudgeted) * 100, 100)
            : 0;

          this.budgets = raw.map((b: any) => {
            const total  = b.limitAmount || 0;
            const spent  = b.totalSpent  || 0;
            const pct    = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
            const share  = this.totalBudgeted > 0 ? (total / this.totalBudgeted) * 100 : 0;
            const status: 'ok' | 'warn' | 'over' =
              pct >= 100 ? 'over' : pct > 80 ? 'warn' : 'ok';

            return {
              id:   b.id,
              name: b.category?.name || 'Overall',
              spent,
              total,
              pct: Math.round(pct),
              share,
              status,
              ...this.iconAndColor(b.category?.name),
            };
          });

          this.overBudgetCount = this.budgets.filter(b => b.status === 'over').length;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(getBackendErrorMessage(err, 'Failed to load budgets.'));
      }
    });
  }

  private iconAndColor(categoryName?: string): { icon: string; color: string } {
    const n = (categoryName || '').toLowerCase();
    if (n.includes('food') || n.includes('grocer') || n.includes('dining'))
      return { icon: 'lucideUtensils', color: '#22c55e' };
    if (n.includes('hous') || n.includes('rent'))
      return { icon: 'lucideHome',     color: '#14b8a6' };
    if (n.includes('transport') || n.includes('car') || n.includes('travel'))
      return { icon: 'lucideCar',      color: '#a78bfa' };
    if (n.includes('entertain') || n.includes('social'))
      return { icon: 'lucideZap',      color: '#f97316' };
    if (n.includes('util') || n.includes('electric') || n.includes('water'))
      return { icon: 'lucideZap',      color: '#60a5fa' };
    if (n.includes('shop') || n.includes('cloth'))
      return { icon: 'lucideShoppingBag', color: '#f43f5e' };
    return { icon: 'lucideTrendingUp', color: '#8EB69B' };
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers,
  lucideTrendingUp,
  lucideTrendingDown,
  lucideCalendar,
  lucideArrowRight,
  lucideWallet,
  lucideAlertCircle
} from '@ng-icons/lucide';
import { forkJoin, catchError, of } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { ToastService } from '../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../core/utils/backend-error';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-social-spending',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, CurrencyFormatPipe],
  providers: [
    provideIcons({ lucideUsers, lucideTrendingUp, lucideTrendingDown, lucideCalendar, lucideArrowRight, lucideWallet, lucideAlertCircle })
  ],
  template: `
    <div class="social-page fade-in">
      <header class="social-header">
        <div>
          <div class="social-title-row">
            <div class="social-title-icon">
              <ng-icon name="lucideUsers" size="22"></ng-icon>
            </div>
            <h1 class="social-title">Social Spending</h1>
          </div>
          <p class="social-subtitle">Track money spent on social activities, events, and going out.</p>
        </div>
        <div class="social-header-actions">
          <select [(ngModel)]="selectedPeriod" (ngModelChange)="onPeriodChange()" class="social-select">
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
          </select>
        </div>
      </header>

      @if (isLoading) {
        <div class="social-loading">
          <div class="social-spinner" aria-hidden="true"></div>
          <p class="social-loading-text">Loading social spending…</p>
        </div>
      } @else {
        <div class="social-stats">
          <div class="social-stat social-stat--accent">
            <p class="social-stat-label">Total Spent</p>
            <p class="social-stat-value">{{ totalSpent | fmt }}</p>
            <p class="social-stat-meta">{{ periodLabel }}</p>
          </div>
          <div class="social-stat">
            <p class="social-stat-label">Transactions</p>
            <p class="social-stat-value">{{ transactions.length }}</p>
            <p class="social-stat-meta">social entries</p>
          </div>
          <div class="social-stat"
               [class.social-stat--warn]="budget && budgetPct >= 80 && budgetPct < 100"
               [class.social-stat--danger]="budget && budgetPct >= 100">
            <p class="social-stat-label">Budget</p>
            @if (budget) {
              <p class="social-stat-value" [class.social-stat-value--warn]="budgetPct >= 80" [class.social-stat-value--danger]="budgetPct >= 100">
                {{ budgetPct | number:'1.0-0' }}%
              </p>
              <div class="social-budget-track">
                <div class="social-budget-fill"
                     [style.width.%]="budgetPct > 100 ? 100 : budgetPct"
                     [class.fill-danger]="budgetPct >= 100"
                     [class.fill-warn]="budgetPct >= 80 && budgetPct < 100"
                     [class.fill-accent]="budgetPct < 80">
                </div>
              </div>
              <p class="social-stat-foot">{{ budget.totalSpent | fmt }} of {{ budget.limitAmount | fmt }}</p>
            } @else {
              <p class="social-stat-dash">—</p>
              <a routerLink="/budgets/create" class="social-link social-link--small">Set a budget</a>
            }
          </div>
        </div>

        @if (budget && budgetPct >= 100) {
          <div class="social-alert social-alert--danger">
            <ng-icon name="lucideAlertCircle" size="18" class="shrink-0"></ng-icon>
            <p>You've exceeded your social budget by {{ (totalSpent - budget.limitAmount) | fmt }}. Consider reviewing your social plans.</p>
          </div>
        } @else if (budget && budgetPct >= 80) {
          <div class="social-alert social-alert--warn">
            <ng-icon name="lucideAlertCircle" size="18" class="shrink-0"></ng-icon>
            <p>You've used {{ budgetPct | number:'1.0-0' }}% of your social budget. Getting close to the limit.</p>
          </div>
        }

        <div class="social-panel">
          <div class="social-panel-head">
            <h2 class="social-panel-title">Transactions</h2>
            <a routerLink="/transactions" class="social-link social-link--inline">
              View all <ng-icon name="lucideArrowRight" size="14"></ng-icon>
            </a>
          </div>

          @if (transactions.length === 0) {
            <div class="social-empty">
              <div class="social-empty-icon">
                <ng-icon name="lucideUsers" size="36"></ng-icon>
              </div>
              <p class="social-empty-title">No social transactions in this period.</p>
              <p class="social-empty-hint">Social spending includes parties, clubs, events, and gifts.</p>
              <a routerLink="/transactions/add" class="social-btn-primary">Add transaction</a>
            </div>
          } @else {
            <ul class="social-tx-list">
              @for (tx of transactions; track tx.id) {
                <li class="social-tx-row">
                  <div class="social-tx-main">
                    <div class="social-tx-icon">
                      <ng-icon name="lucideUsers" size="18"></ng-icon>
                    </div>
                    <div>
                      <p class="social-tx-desc">{{ tx.description || 'Social expense' }}</p>
                      <p class="social-tx-date">
                        <ng-icon name="lucideCalendar" size="11"></ng-icon>
                        {{ tx.date | date:'MMM d, y' }}
                      </p>
                    </div>
                  </div>
                  <span class="social-tx-amount">-{{ tx.amount | fmt }}</span>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .fade-in {
      animation: socialFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes socialFadeIn {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .social-page {
      max-width: 56rem;
      margin: 0 auto;
      padding: 1rem 1.25rem 2.5rem;
    }
    @media (min-width: 768px) {
      .social-page { padding: 1.75rem 2rem 3rem; }
    }

    .social-header {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    @media (min-width: 768px) {
      .social-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 2.25rem;
      }
    }

    .social-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .social-title-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--border-medium);
    }

    .social-title {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }

    .social-subtitle {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.5;
      color: var(--text-secondary);
      max-width: 36rem;
    }

    .social-header-actions { flex-shrink: 0; }

    .social-select {
      width: 100%;
      min-width: 11rem;
      padding: 0.65rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.75rem;
      cursor: pointer;
      outline: none;
      background: var(--card-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .social-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-dim);
    }
    html.light .social-select option {
      background: var(--card-bg-solid);
      color: var(--text-primary);
    }

    .social-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      gap: 1rem;
    }
    .social-spinner {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      border: 3px solid var(--accent-dim);
      border-top-color: var(--accent);
      animation: socialSpin 0.85s linear infinite;
    }
    @keyframes socialSpin { to { transform: rotate(360deg); } }
    .social-loading-text {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .social-stats {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    @media (min-width: 640px) {
      .social-stats { grid-template-columns: repeat(3, 1fr); }
    }

    .social-stat {
      border-radius: 1rem;
      padding: 1.15rem 1.25rem;
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      box-shadow:
        rgba(50, 50, 93, 0.25) 0px 50px 100px -20px,
        rgba(0, 0, 0, 0.3) 0px 30px 60px -30px,
        rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .social-stat--accent {
      border-left: 4px solid var(--accent);
    }
    .social-stat--warn {
      border-color: rgba(245, 158, 11, 0.35);
    }
    .social-stat--danger {
      border-color: rgba(239, 68, 68, 0.4);
    }

    .social-stat-label {
      margin: 0 0 0.35rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .social-stat-value {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .social-stat-value--warn { color: #fbbf24; }
    .social-stat-value--danger { color: #f87171; }
    html.light .social-stat-value--warn { color: #d97706; }
    html.light .social-stat-value--danger { color: #dc2626; }

    .social-stat-meta {
      margin: 0.35rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .social-stat-dash {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-muted);
      opacity: 0.6;
    }

    .social-stat-foot {
      margin: 0.35rem 0 0;
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .social-budget-track {
      margin-top: 0.5rem;
      height: 6px;
      border-radius: 999px;
      background: var(--surface-alt);
      overflow: hidden;
    }
    .social-budget-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.35s ease;
    }
    .social-budget-fill.fill-accent { background: linear-gradient(90deg, var(--accent), #16a34a); }
    .social-budget-fill.fill-warn { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .social-budget-fill.fill-danger { background: linear-gradient(90deg, #ef4444, #b91c1c); }

    .social-link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .social-link:hover { opacity: 0.85; text-decoration: underline; }
    .social-link--small {
      display: inline-block;
      margin-top: 0.35rem;
      font-size: 0.75rem;
    }
    .social-link--inline {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .social-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-radius: 0.75rem;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      line-height: 1.45;
    }
    .social-alert p { margin: 0; }
    .social-alert--danger {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fecaca;
    }
    html.light .social-alert--danger {
      color: #991b1b;
      background: rgba(254, 226, 226, 0.9);
      border-color: rgba(239, 68, 68, 0.35);
    }
    .social-alert--warn {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fde68a;
    }
    html.light .social-alert--warn {
      color: #92400e;
      background: rgba(254, 243, 199, 0.85);
      border-color: rgba(245, 158, 11, 0.45);
    }

    .social-panel {
      border-radius: 1rem;
      overflow: hidden;
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      box-shadow:
        rgba(50, 50, 93, 0.25) 0px 50px 100px -20px,
        rgba(0, 0, 0, 0.3) 0px 30px 60px -30px,
        rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }

    .social-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .social-panel-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .social-empty {
      padding: 2.5rem 1.5rem 2.75rem;
      text-align: center;
    }
    .social-empty-icon {
      width: 3.5rem;
      height: 3.5rem;
      margin: 0 auto 1rem;
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-dim);
      color: var(--accent);
      opacity: 0.9;
    }
    .social-empty-title {
      margin: 0 0 0.35rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .social-empty-hint {
      margin: 0 auto 1.25rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 22rem;
    }

    .social-btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.6rem 1.15rem;
      font-size: 0.875rem;
      font-weight: 700;
      border-radius: 0.75rem;
      text-decoration: none;
      color: #fff;
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .social-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(34, 197, 94, 0.45);
    }

    .social-tx-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .social-tx-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s ease;
    }
    .social-tx-row:last-child { border-bottom: none; }
    .social-tx-row:hover {
      background: var(--surface-alt);
    }

    .social-tx-main {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
    }

    .social-tx-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.65rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--border-medium);
    }

    .social-tx-desc {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 16rem;
    }
    @media (min-width: 480px) {
      .social-tx-desc { max-width: 22rem; }
    }

    .social-tx-date {
      margin: 0.2rem 0 0;
      font-size: 0.7rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-muted);
    }

    .social-tx-amount {
      font-size: 0.9rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #f87171;
      flex-shrink: 0;
    }
    html.light .social-tx-amount {
      color: #dc2626;
    }
  `]
})
export class SocialSpendingComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private budgetService = inject(BudgetService);
  private toast = inject(ToastService);

  isLoading = true;
  transactions: any[] = [];
  budget: any = null;
  totalSpent = 0;
  budgetPct = 0;
  selectedPeriod = '30';

  get periodLabel(): string {
    const labels: Record<string, string> = { '30': 'Last 30 days', '90': 'Last 3 months', '180': 'Last 6 months' };
    return labels[this.selectedPeriod] ?? 'Last 30 days';
  }

  ngOnInit(): void {
    this.loadData();
  }

  onPeriodChange(): void {
    this.loadData();
  }

  private getDateFrom(): string {
    const d = new Date();
    d.setDate(d.getDate() - Number(this.selectedPeriod));
    return d.toISOString().slice(0, 10);
  }

  loadData(): void {
    this.isLoading = true;
    const dateFrom = this.getDateFrom();
    const dateTo = new Date().toISOString().slice(0, 10);

    forkJoin({
      transactions: this.transactionService.getTransactions({ type: 'expense', dateFrom, dateTo, limit: 200 }).pipe(
        catchError(() => of({ data: [] }))
      ),
      budgets: this.budgetService.getBudgets().pipe(
        catchError(() => of({ data: [] }))
      ),
    }).subscribe({
      next: ({ transactions, budgets }) => {
        const allTx: any[] = Array.isArray(transactions.data)
          ? transactions.data
          : (transactions.data?.transactions ?? []);

        this.transactions = allTx.filter((tx: any) =>
          tx.category?.slug === 'social' ||
          tx.category?.name?.toLowerCase().includes('social')
        );

        this.totalSpent = this.transactions.reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0);

        const allBudgets: any[] = Array.isArray(budgets.data) ? budgets.data : [];
        this.budget = allBudgets.find((b: any) => b.category?.slug === 'social') ?? null;
        this.budgetPct = this.budget && this.budget.limitAmount > 0
          ? (this.totalSpent / Number(this.budget.limitAmount)) * 100
          : 0;

        this.isLoading = false;
      },
      error: (err) => {
        this.toast.error(getBackendErrorMessage(err, 'Failed to load social spending data.'));
        this.isLoading = false;
      }
    });
  }
}

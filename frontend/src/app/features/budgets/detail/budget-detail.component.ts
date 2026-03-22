import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEdit3, lucideTrash2, lucideShoppingBag, lucideCoffee, lucideZap } from '@ng-icons/lucide';
import { BudgetService } from '../../../core/services/budget.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmModalComponent } from '../../../shared/confirm-modal/confirm-modal.component';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

interface Transaction {
  id: string;
  merchant: string;
  date: Date;
  amount: number;
  icon: string;
}

@Component({
  selector: 'app-budget-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, ConfirmModalComponent, CurrencyFormatPipe],
  viewProviders: [
    provideIcons({ lucideArrowLeft, lucideEdit3, lucideTrash2, lucideShoppingBag, lucideCoffee, lucideZap })
  ],
  template: `
    <div class="detail-wrap fade-in">

      @if (isLoading) {
        <div class="loading-state">
          <span class="spinner"></span>
        </div>
      }

      @if (!isLoading && budget) {

        <!-- ── Header ──────────────────────────────────────────── -->
        <header class="detail-header">
          <button routerLink=".." class="btn-back">
            <ng-icon name="lucideArrowLeft" size="18"></ng-icon>
            Back
          </button>
          <div class="header-actions">
            <button class="icon-btn edit-btn" title="Edit budget">
              <ng-icon name="lucideEdit3" size="18"></ng-icon>
            </button>
            <button type="button" class="icon-btn delete-btn" (click)="openDeleteConfirm()" [disabled]="deleting" title="Delete budget">
              <ng-icon name="lucideTrash2" size="18"></ng-icon>
            </button>
          </div>
        </header>

        <!-- ── Hero card ───────────────────────────────────────── -->
        <div class="hero-card slide-up">

          <!-- Top progress strip -->
          <div class="hero-strip">
            <div class="hero-strip-fill"
                 [class.warn]="isWarn(budget.spent, budget.total)"
                 [class.over]="isOver(budget.spent, budget.total)"
                 [style.width.%]="utilPct(budget.spent, budget.total)"></div>
          </div>

          <div class="hero-body">
            <div class="hero-left">
              <span class="category-pill">{{ budget.category }}</span>
              <h1 class="hero-name">{{ budget.name }}</h1>
            </div>
            <div class="hero-right">
              <p class="spent-label">Total Spent</p>
              <div class="spent-row">
                <span class="spent-amount" [class.warn]="isWarn(budget.spent, budget.total)" [class.over]="isOver(budget.spent, budget.total)">
                  {{ budget.spent | fmt }}
                </span>
                <span class="spent-of">/ {{ budget.total | fmt }}</span>
              </div>
            </div>
          </div>

          <!-- Main progress bar -->
          <div class="progress-track">
            <div class="progress-fill"
                 [class.warn]="isWarn(budget.spent, budget.total)"
                 [class.over]="isOver(budget.spent, budget.total)"
                 [style.width.%]="utilPct(budget.spent, budget.total)"></div>
          </div>

          <div class="progress-labels">
            <span>{{ utilPct(budget.spent, budget.total) | number:'1.0-0' }}% utilized</span>
            <span class="remaining-badge"
                  [class.over]="isOver(budget.spent, budget.total)">
              @if (!isOver(budget.spent, budget.total)) {
                {{ (budget.total - budget.spent) | fmt }} left
              } @else {
                Over by {{ (budget.spent - budget.total) | fmt }}
              }
            </span>
          </div>
        </div>

        <!-- ── Recent Transactions ──────────────────────────────── -->
        <section class="txn-section slide-up" style="animation-delay: 0.15s">
          <h2 class="section-title">Recent Transactions</h2>
          <div class="txn-list">
            @for (tx of transactions; track tx.id; let last = $last) {
              <div class="txn-row" [class.no-border]="last">
                <div class="txn-icon-wrap">
                  <ng-icon [name]="tx.icon" size="22"></ng-icon>
                </div>
                <div class="txn-info">
                  <p class="txn-merchant">{{ tx.merchant }}</p>
                  <p class="txn-date">{{ tx.date | date:'mediumDate' }}</p>
                </div>
                <span class="txn-amount">-{{ tx.amount | fmt }}</span>
              </div>
            }
            @if (transactions.length === 0) {
              <div class="txn-empty">
                <p>No transactions found for this budget.</p>
              </div>
            }
          </div>
        </section>

      }

      <app-confirm-modal
        [open]="showDeleteConfirm"
        title="Delete this budget?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        [danger]="true"
        (confirm)="confirmDelete()"
        (cancel)="closeDeleteConfirm()">
      </app-confirm-modal>
    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────────── */
    .detail-wrap {
      max-width: 900px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .fade-in  { animation: fadeIn  0.45s ease-out; }
    .slide-up { animation: slideUp 0.5s  cubic-bezier(0.16,1,0.3,1) both; }
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Loading ─────────────────────────────────────────────── */
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 6rem 0;
    }
    .spinner {
      display: block;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid var(--border-medium);
      border-top-color: var(--accent);
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Header ──────────────────────────────────────────────── */
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      background: var(--surface);
      border: 1px solid var(--border-medium);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      text-decoration: none;
    }
    .btn-back:hover { background: var(--surface-raised); border-color: var(--accent); color: var(--accent); }

    .header-actions { display: flex; gap: 0.5rem; }
    .icon-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      border: 1px solid var(--border-medium);
      background: var(--surface);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .edit-btn:hover   { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
    .delete-btn:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.4); color: #f87171; }

    /* ── Hero card ───────────────────────────────────────────── */
    .hero-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      overflow: hidden;
      margin-bottom: 2rem;
      box-shadow:
        rgba(50,50,93,0.15) 0px 30px 60px -15px,
        rgba(0,0,0,0.2) 0px 18px 36px -18px;
    }

    /* Strip */
    .hero-strip { height: 5px; background: var(--border-subtle); width: 100%; }
    .hero-strip-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #16a34a);
      transition: width 1s ease;
    }
    .hero-strip-fill.warn { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .hero-strip-fill.over { background: linear-gradient(90deg, #ef4444, #f87171); }

    .hero-body {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 2rem 2.5rem 1.5rem;
    }

    .category-pill {
      display: inline-block;
      padding: 0.3rem 0.9rem;
      border-radius: 999px;
      background: var(--accent-dim);
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      border: 1px solid var(--accent-glow);
    }
    .hero-name {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .hero-right { text-align: right; }
    .spent-label {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      margin: 0 0 0.4rem 0;
    }
    .spent-row { display: flex; align-items: baseline; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
    .spent-amount {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .spent-amount.warn { color: #f59e0b; }
    .spent-amount.over { color: #f87171; }
    .spent-of { font-size: 1.1rem; color: var(--text-primary); opacity: 0.45; font-weight: 500; }

    /* Progress bar */
    .progress-track {
      height: 10px;
      background: var(--surface);
      border-radius: 999px;
      overflow: hidden;
      margin: 0 2.5rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #16a34a);
      border-radius: 999px;
      transition: width 1s ease;
    }
    .progress-fill.warn { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .progress-fill.over { background: linear-gradient(90deg, #ef4444, #f87171); }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 2.5rem 1.75rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      opacity: 0.7;
    }
    .remaining-badge {
      padding: 0.3rem 0.9rem;
      border-radius: 999px;
      background: var(--accent-dim);
      color: var(--accent);
      font-size: 0.82rem;
      font-weight: 700;
      border: 1px solid var(--accent-glow);
      opacity: 1;
    }
    .remaining-badge.over {
      background: rgba(239,68,68,0.1);
      color: #f87171;
      border-color: rgba(239,68,68,0.25);
    }

    /* ── Transactions section ────────────────────────────────── */
    .section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 1.25rem 0;
      letter-spacing: -0.02em;
    }
    .txn-list {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        rgba(50,50,93,0.08) 0px 15px 35px -10px,
        rgba(0,0,0,0.1) 0px 8px 18px -10px;
    }
    .txn-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.125rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s;
    }
    .txn-row.no-border { border-bottom: none; }
    .txn-row:hover { background: var(--surface-alt); }

    .txn-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--accent-dim);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--accent-glow);
    }
    .txn-info { flex: 1; min-width: 0; }
    .txn-merchant {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .txn-date {
      font-size: 0.8rem;
      color: var(--text-primary);
      opacity: 0.5;
      margin: 0.2rem 0 0 0;
    }
    .txn-amount {
      font-size: 1rem;
      font-weight: 800;
      color: #f87171;
      flex-shrink: 0;
    }
    .txn-empty {
      padding: 3rem;
      text-align: center;
      color: var(--text-primary);
      opacity: 0.45;
      font-size: 0.95rem;
    }
    .txn-empty p { margin: 0; }

    /* ── Responsive ──────────────────────────────────────────── */
    @media (max-width: 640px) {
      .detail-wrap { padding: 1.5rem 1rem; }
      .hero-body { padding: 1.5rem 1.25rem 1.25rem; }
      .progress-track { margin: 0 1.25rem; }
      .progress-labels { padding: 0.6rem 1.25rem 1.25rem; }
      .hero-name { font-size: 1.75rem; }
      .spent-amount { font-size: 1.75rem; }
      .hero-right { text-align: left; }
    }
  `]
})
export class BudgetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private budgetService = inject(BudgetService);
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);

  isLoading = true;
  budget: any = null;
  transactions: Transaction[] = [];
  deleting = false;
  showDeleteConfirm = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.budgetService.getBudget(id).subscribe({
      next: (res) => {
        const b = res?.data ?? res;
        this.budget = {
          id: b.id,
          name: b.category?.name || 'Budget',
          spent: b.totalSpent || 0,
          total: b.limitAmount || 0,
          category: b.category?.name || '',
          period: b.period || '',
          remaining: b.remaining ?? ((b.limitAmount || 0) - (b.totalSpent || 0)),
          percentageUsed: b.percentageUsed || 0,
        };
        if (b.category?.id) {
          this.transactionService.getTransactions({ categoryId: b.category.id, limit: 10 }).subscribe({
            next: (txRes) => {
              const items: any[] = Array.isArray(txRes.data) ? txRes.data : (txRes.data?.transactions ?? []);
              this.transactions = items.map((tx: any) => ({
                id: tx.id,
                merchant: tx.description,
                date: new Date(tx.date),
                amount: tx.amount,
                icon: 'lucideShoppingBag',
              }));
            },
          });
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  utilPct(spent: number, total: number): number {
    return Math.min((spent / total) * 100, 100);
  }
  isWarn(spent: number, total: number): boolean { return total > 0 && spent / total > 0.8 && spent < total; }
  isOver(spent: number, total: number): boolean { return spent >= total; }

  openDeleteConfirm() {
    if (!this.budget?.id || this.deleting) return;
    this.showDeleteConfirm = true;
  }
  closeDeleteConfirm() { this.showDeleteConfirm = false; }

  confirmDelete() {
    if (!this.budget?.id || this.deleting) return;
    this.showDeleteConfirm = false;
    this.deleting = true;
    this.budgetService.deleteBudget(this.budget.id).subscribe({
      next: () => {
        this.toast.success('Budget deleted successfully.');
        this.router.navigate(['/budgets']);
      },
      error: (err) => {
        this.deleting = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not delete budget.'));
      }
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEdit3, lucideTrash2, lucideShoppingBag, lucideCoffee, lucideZap } from '@ng-icons/lucide';
import { BudgetService } from '../../../core/services/budget.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

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
  imports: [CommonModule, RouterLink, NgIconComponent],
  viewProviders: [
    provideIcons({ lucideArrowLeft, lucideEdit3, lucideTrash2, lucideShoppingBag, lucideCoffee, lucideZap })
  ],
  template: `
    <div class="detail-container max-w-4xl mx-auto p-4 md:p-8 animation-fade-in">
      @if (isLoading) {
        <div class="flex justify-center items-center py-24">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 budget-detail-spinner"></div>
        </div>
      }
      @if (!isLoading && budget) {
      <header class="flex justify-between items-center mb-8">
        <button routerLink=".." class="budget-detail-back inline-flex items-center gap-2 bg-white border-2 border-white py-2.5 px-4 rounded-xl font-medium text-sm shadow-sm transition-colors">
          <ng-icon name="lucideArrowLeft" size="20"></ng-icon>
          <span>Back</span>
        </button>
        <div class="flex gap-4">
          <button class="w-12 h-12 rounded-full flex items-center justify-center bg-(--surface-alt) hover:bg-(--surface) text-(--text-primary) transition-colors shadow-sm">
            <ng-icon name="lucideEdit3" size="20"></ng-icon>
          </button>
          <button type="button" (click)="confirmDelete()" [disabled]="deleting" class="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shadow-sm disabled:opacity-50">
            <ng-icon name="lucideTrash2" size="20"></ng-icon>
          </button>
        </div>
      </header>

      <div class="hero-card p-8 md:p-12 rounded-[40px] bg-(--card-bg-solid) border border-(--border-subtle) mb-12 relative overflow-hidden shadow-xl">
        <div class="absolute top-0 left-0 right-0 h-2 rounded-t-[40px] overflow-hidden">
          <div class="h-full transition-all duration-1000 ease-out relative"
                [ngClass]="getProgressBarColor(budget.spent, budget.total)"
                [style.width.%]="getUtilization(budget.spent, budget.total)">
                <div class="absolute top-0 right-0 bottom-0 w-8 bg-white/20 blur-md"></div>
           </div>
        </div>
        
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 pt-4">
          <div>
            <div class="inline-block px-5 py-2 rounded-full budget-detail-category text-sm font-bold tracking-widest mb-6 uppercase">
              {{ budget.category }}
            </div>
            <h1 class="text-6xl font-extrabold tracking-tight budget-detail-title">{{ budget.name }}</h1>
          </div>
          <div class="text-left md:text-right">
            <p class="text-sm font-bold uppercase tracking-widest budget-detail-label mb-2">Total Spent</p>
            <div class="flex items-baseline md:justify-end gap-2 flex-wrap">
              <span class="text-5xl md:text-6xl font-extrabold tracking-tight budget-detail-spent">{{ budget.spent | currency:'KES':'symbol':'1.0-0' }}</span>
              <span class="text-2xl budget-detail-total font-medium">/ {{ budget.total | currency:'KES':'symbol':'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <div class="progress-container h-3 w-full bg-(--surface-alt) rounded-full overflow-hidden mb-6">
          <div class="progress-bar h-full rounded-full transition-all duration-1000 ease-out relative" 
               [ngClass]="getProgressBarColor(budget.spent, budget.total)"
               [style.width.%]="getUtilization(budget.spent, budget.total)">
            <div class="absolute top-0 right-0 bottom-0 w-8 bg-white/20 blur-md"></div>
          </div>
        </div>
        <div class="flex justify-between text-sm font-semibold budget-detail-meta">
          <span>{{ getUtilization(budget.spent, budget.total) | number:'1.0-0' }}% utilized</span>
          <span [class.text-red-500]="(budget.total - budget.spent) < 0" [class.bg-red-500]="(budget.total - budget.spent) < 0" [class.bg-opacity-10]="(budget.total - budget.spent) < 0" class="px-4 py-1 rounded-full budget-detail-remaining">
            {{ (budget.total - budget.spent) >= 0 ? ((budget.total - budget.spent) | currency:'KES':'symbol':'1.0-0') + ' left' : 'Over budget by ' + ((budget.spent - budget.total) | currency:'KES':'symbol':'1.0-0') }}
          </span>
        </div>
      </div>

      <div class="transactions-section animation-slide-up" style="animation-delay: 0.2s; animation-fill-mode: both;">
        <h2 class="text-2xl md:text-3xl font-extrabold text-(--text-primary) mb-6">Recent Transactions</h2>
        <div class="fin-list bg-(--card-bg-solid) rounded-[32px] border border-(--border-subtle) overflow-hidden">
          @for (tx of transactions; track tx.id; let last = $last) {
            <div class="flex items-center justify-between p-6 md:p-8 transition-colors hover:bg-(--surface-alt)" [ngClass]="{'border-b border-(--border-medium)': !last}">
              <div class="flex items-center gap-6">
                <div class="w-14 h-14 rounded-2xl bg-white border-2 flex items-center justify-center shadow-sm budget-detail-tx-icon">
                  <ng-icon [name]="tx.icon" size="28"></ng-icon>
                </div>
                <div>
                  <h3 class="font-bold text-(--text-primary) text-xl">{{ tx.merchant }}</h3>
                  <p class="text-base text-(--text-secondary) font-medium mt-1">{{ tx.date | date:'mediumDate' }}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="font-bold text-2xl budget-detail-tx-amount">-{{ tx.amount | currency:'KES':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          }
          @if (transactions.length === 0) {
            <div class="p-12 text-center text-(--text-secondary)">
              <p class="text-xl font-medium">No transactions found for this budget.</p>
            </div>
          }
        </div>
      </div>
      } <!-- end !isLoading && budget -->
    </div>
  `,
  styles: [`
    .hero-card {
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }

    .fin-list {
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }

    .animation-fade-in {
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animation-slide-up {
      opacity: 0;
      transform: translateY(40px);
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      to { opacity: 1; transform: translateY(0); }
    }

    .budget-detail-spinner { border-color: #16a34a; }
    .budget-detail-back { color: #16a34a; }
    .budget-detail-back:hover { background: rgba(22, 163, 74, 0.12); border-color: #16a34a !important; }
    .budget-detail-category { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
    .budget-detail-title { color: var(--text-primary); }
    .budget-detail-label { color: #059669; letter-spacing: 0.08em; }
    .budget-detail-spent { color: #16a34a !important; }
    .budget-detail-total { color: #059669; opacity: 0.9; }
    .budget-detail-meta { color: var(--text-secondary, #6b7280); }
    .budget-detail-remaining:not(.text-red-500) { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
    .budget-detail-progress { background: var(--accent); }
    .budget-detail-tx-icon { border-color: #16a34a; color: #16a34a; }
    .budget-detail-tx-amount { color: #16a34a; }
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
          total: b.limitAmount || b.limit || 0,
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

  getUtilization(spent: number, total: number): number {
    return Math.min((spent / total) * 100, 100);
  }

  getProgressBarColor(spent: number, total: number): string {
    const ratio = total ? spent / total : 0;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio > 0.8) return 'bg-amber-400';
    return 'budget-detail-progress';
  }

  confirmDelete() {
    if (!this.budget?.id || this.deleting) return;
    if (!confirm('Delete this budget? This cannot be undone.')) return;
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

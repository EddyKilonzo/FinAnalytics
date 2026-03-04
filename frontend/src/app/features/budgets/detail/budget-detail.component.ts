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
  imports: [CommonModule, RouterLink, NgIconComponent, ConfirmModalComponent],
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
        <button routerLink=".." class="budget-detail-back inline-flex items-center gap-2 bg-white border-2 border-emerald-500 text-emerald-600 py-2.5 px-5 rounded-xl font-semibold text-sm shadow-sm hover:bg-emerald-50 hover:shadow-md transition-all duration-200">
          <ng-icon name="lucideArrowLeft" size="20"></ng-icon>
          <span>Back</span>
        </button>
        <div class="flex gap-3">
          <button class="w-12 h-12 rounded-full flex items-center justify-center bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:shadow-md transition-all duration-200 shadow-sm" title="Edit budget">
            <ng-icon name="lucideEdit3" size="20"></ng-icon>
          </button>
          <button type="button" (click)="openDeleteConfirm()" [disabled]="deleting" class="w-12 h-12 rounded-full flex items-center justify-center bg-white border-2 border-red-400 text-red-500 hover:bg-red-50 hover:shadow-md transition-all duration-200 shadow-sm disabled:opacity-50" title="Delete budget">
            <ng-icon name="lucideTrash2" size="20"></ng-icon>
          </button>
        </div>
      </header>

      <div class="hero-card p-8 md:p-12 rounded-[32px] bg-white border-2 border-emerald-500/30 hero-card-inner mb-12 relative overflow-hidden">
        <!-- Decorative corner accent -->
        <div class="hero-card-accent" aria-hidden="true"></div>
        <!-- Top progress strip -->
        <div class="absolute top-0 left-0 right-0 h-1.5 rounded-t-[30px] overflow-hidden bg-emerald-100">
          <div class="h-full transition-all duration-1000 ease-out relative rounded-r-full progress-fill"
                [ngClass]="getProgressBarColor(budget.spent, budget.total)"
                [style.width.%]="getUtilization(budget.spent, budget.total)">
            <div class="absolute top-0 right-0 bottom-0 w-12 bg-white/30 blur-lg"></div>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 pt-6">
          <div>
            <div class="inline-block px-4 py-2 rounded-full bg-white border-2 border-emerald-500/50 text-emerald-700 text-xs font-bold tracking-widest mb-5 uppercase shadow-sm">
              {{ budget.category }}
            </div>
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-800 hero-title">{{ budget.name }}</h1>
          </div>
          <div class="text-left md:text-right">
            <p class="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Total Spent</p>
            <div class="flex items-baseline md:justify-end gap-2 flex-wrap">
              <span class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-emerald-600 hero-amount">{{ budget.spent | currency:'KES':'symbol':'1.0-0' }}</span>
              <span class="text-xl md:text-2xl text-gray-500 font-medium">/ {{ budget.total | currency:'KES':'symbol':'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <div class="progress-wrapper h-4 w-full rounded-full overflow-hidden mb-5 bg-gray-100 border border-gray-200/80">
          <div class="h-full rounded-full transition-all duration-1000 ease-out relative progress-fill"
               [ngClass]="getProgressBarColor(budget.spent, budget.total)"
               [style.width.%]="getUtilization(budget.spent, budget.total)">
            <div class="absolute top-0 right-0 bottom-0 w-10 bg-white/40 blur-md rounded-r-full"></div>
          </div>
        </div>
        <div class="flex justify-between items-center text-sm font-semibold text-gray-600">
          <span>{{ getUtilization(budget.spent, budget.total) | number:'1.0-0' }}% utilized</span>
          <span [class]="(budget.total - budget.spent) < 0 ? 'px-4 py-2 rounded-full bg-red-50 border-2 border-red-300 text-red-600 font-bold' : 'px-4 py-2 rounded-full bg-white border-2 border-emerald-500/50 text-emerald-700 font-bold shadow-sm budget-detail-remaining'">
            {{ (budget.total - budget.spent) >= 0 ? ((budget.total - budget.spent) | currency:'KES':'symbol':'1.0-0') + ' left' : 'Over budget by ' + ((budget.spent - budget.total) | currency:'KES':'symbol':'1.0-0') }}
          </span>
        </div>
      </div>

      <div class="transactions-section animation-slide-up" style="animation-delay: 0.2s; animation-fill-mode: both;">
        <h2 class="text-2xl md:text-3xl font-extrabold text-gray-800 mb-6">Recent Transactions</h2>
        <div class="fin-list bg-white rounded-[24px] border-2 border-emerald-500/20 overflow-hidden shadow-lg">
          @for (tx of transactions; track tx.id; let last = $last) {
            <div class="flex items-center justify-between p-5 md:p-6 transition-all duration-200 hover:bg-emerald-50/50 hover:shadow-inner fin-list-item" [ngClass]="{'border-b border-gray-200': !last}">
              <div class="flex items-center gap-5">
                <div class="w-14 h-14 rounded-2xl bg-white border-2 border-emerald-500/50 flex items-center justify-center text-emerald-600 shadow-sm">
                  <ng-icon [name]="tx.icon" size="28"></ng-icon>
                </div>
                <div>
                  <h3 class="font-bold text-gray-800 text-lg">{{ tx.merchant }}</h3>
                  <p class="text-sm text-gray-500 font-medium mt-0.5">{{ tx.date | date:'mediumDate' }}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="font-bold text-xl text-emerald-600">-{{ tx.amount | currency:'KES':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          }
          @if (transactions.length === 0) {
            <div class="p-12 text-center text-gray-500">
              <p class="text-xl font-medium">No transactions found for this budget.</p>
            </div>
          }
        </div>
      </div>
      } <!-- end !isLoading && budget -->
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
    .hero-card {
      box-shadow:
        0 4px 6px -1px rgba(5, 150, 105, 0.06),
        0 10px 20px -5px rgba(5, 150, 105, 0.08),
        0 20px 40px -10px rgba(0, 0, 0, 0.08);
      transition: box-shadow 0.25s ease, transform 0.25s ease;
    }
    .hero-card:hover {
      box-shadow:
        0 8px 15px -3px rgba(5, 150, 105, 0.08),
        0 20px 35px -10px rgba(5, 150, 105, 0.1),
        0 25px 50px -15px rgba(0, 0, 0, 0.1);
    }
    .hero-card-accent {
      position: absolute;
      top: -60px;
      right: -60px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(5, 150, 105, 0.06) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-title { color: #1f2937; }
    .hero-amount { color: #059669; }

    .progress-fill.budget-detail-progress {
      background: linear-gradient(90deg, #059669 0%, #10b981 100%);
    }
    .progress-fill.bg-amber-400 {
      background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
    }
    .progress-fill.bg-red-500 {
      background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
    }

    .fin-list {
      box-shadow:
        0 2px 8px rgba(5, 150, 105, 0.06),
        0 12px 24px -8px rgba(0, 0, 0, 0.06);
    }
    .fin-list-item:hover {
      border-color: rgba(5, 150, 105, 0.2);
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

    .budget-detail-spinner { border-color: #059669; }
    .budget-detail-remaining { }
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

  openDeleteConfirm() {
    if (!this.budget?.id || this.deleting) return;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
  }

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

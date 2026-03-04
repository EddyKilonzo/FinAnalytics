import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideWallet, lucideUtensils, lucideHome, lucideCar, lucideChevronRight, lucideTrendingUp } from '@ng-icons/lucide';
import { BudgetService } from '../../../core/services/budget.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

interface Budget {
  id: string;
  name: string;
  spent: number;
  total: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  viewProviders: [
    provideIcons({ lucidePlus, lucideWallet, lucideUtensils, lucideHome, lucideCar, lucideChevronRight, lucideTrendingUp })
  ],
  template: `
    <div class="budgets-container max-w-5xl mx-auto p-4 md:p-8">
      <header class="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
        <div>
          <h1 class="text-5xl font-extrabold tracking-tight text-white">Budgets</h1>
          <p class="text-white/60 mt-3 text-xl">Track and manage your spending limits.</p>
        </div>
        <button routerLink="create" class="create-btn group flex items-center justify-center gap-2 bg-white border-2 px-6 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:-translate-y-1" style="border-color: var(--accent); color: var(--accent)">
          <ng-icon name="lucidePlus" size="24"></ng-icon>
          <span>New Budget</span>
        </button>
      </header>

      @if (isLoading) {
        <div class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      } @else {
        <div class="budget-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (budget of budgets; track budget.id) {
            <div [routerLink]="[budget.id]" class="budget-card cursor-pointer group p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-[var(--accent)] transition-all duration-300 hover:shadow-xl relative overflow-hidden">
              <div class="flex justify-between items-start mb-5 relative z-10">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center border-2 shrink-0"
                     [style.border-color]="budget.color"
                     [style.color]="budget.color"
                     [style.background]="budget.color + '18'">
                  <ng-icon [name]="budget.icon" size="28"></ng-icon>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Remaining</p>
                  <p class="text-2xl font-extrabold tabular-nums remaining-amount" 
                     [class.text-red-600]="(budget.total - budget.spent) < 0">
                    {{ (budget.total - budget.spent) | currency:'KES':'symbol':'1.0-0' }}
                  </p>
                </div>
              </div>
              
              <div class="mb-4 relative z-10">
                <h2 class="text-xl font-bold text-slate-900">{{ budget.name }}</h2>
                <p class="text-sm text-slate-500 mt-1 font-medium">
                  <span class="text-slate-700 font-semibold">{{ budget.spent | currency:'KES':'symbol':'1.0-0' }}</span> of {{ budget.total | currency:'KES':'symbol':'1.0-0' }}
                </p>
              </div>
              
              <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                <div class="h-full rounded-full transition-all duration-500 ease-out" 
                     [ngClass]="getProgressBarColor(budget.spent, budget.total)"
                     [style.width.%]="getUtilization(budget.spent, budget.total)">
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .budget-card {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
      animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      transform: translateY(20px);
    }
    .budget-card:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
    }
    .create-btn:hover { background: var(--accent-dim); }
    .create-btn { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
    .remaining-amount:not(.text-red-600) { color: var(--accent); }
    .budget-grid > .budget-card:nth-child(1) { animation-delay: 0.05s; }
    .budget-grid > .budget-card:nth-child(2) { animation-delay: 0.1s; }
    .budget-grid > .budget-card:nth-child(3) { animation-delay: 0.15s; }
    .budget-grid > .budget-card:nth-child(4) { animation-delay: 0.2s; }
    @keyframes fadeInUp {
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class BudgetListComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private toast = inject(ToastService);

  budgets: Budget[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.fetchBudgets();
  }

  fetchBudgets(): void {
    this.isLoading = true;
    this.budgetService.getBudgets().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.budgets = response.data.map((b: any) => ({
            id: b.id,
            name: b.category?.name || 'Overall',
            spent: b.totalSpent || 0,
            total: b.limitAmount || b.limit || 0,
            ...this.getFallbackIconAndColor(b.category?.name)
          }));
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(getBackendErrorMessage(err, 'Failed to load budgets.'));
      }
    });
  }

  getFallbackIconAndColor(categoryName?: string): { icon: string, color: string } {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('grocer') || name.includes('food')) {
      return { icon: 'lucideUtensils', color: '#10b981' };
    }
    if (name.includes('hous') || name.includes('rent')) {
      return { icon: 'lucideHome', color: '#3b82f6' };
    }
    if (name.includes('transport') || name.includes('car')) {
      return { icon: 'lucideCar', color: '#a855f7' };
    }
    if (name.includes('entertain')) {
      return { icon: 'lucideWallet', color: '#f43f5e' };
    }
    const colors = ['#6366f1', '#14b8a6', '#06b6d4', '#d946ef', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return { icon: 'lucideTrendingUp', color: randomColor };
  }

  getUtilization(spent: number, total: number): number {
    if (!total) return 0;
    return Math.min((spent / total) * 100, 100);
  }

  getProgressBarColor(spent: number, total: number): string {
    if (!total) return 'bg-[var(--accent)]';
    const ratio = spent / total;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio > 0.8) return 'bg-amber-400';
    return 'bg-[var(--accent)]';
  }
}

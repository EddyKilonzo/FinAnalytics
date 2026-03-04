import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideSave, lucidePieChart } from '@ng-icons/lucide';
import { BudgetService } from '../../../core/services/budget.service';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

@Component({
  selector: 'app-budget-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgIconComponent],
  viewProviders: [
    provideIcons({ lucideArrowLeft, lucideSave, lucidePieChart })
  ],
  template: `
    <div class="create-container max-w-2xl mx-auto p-4 md:p-6 animation-fade-in">
      <button routerLink=".." class="btn-back-unified mb-6 inline-flex items-center gap-2 bg-white border-2 border-white py-2.5 px-4 rounded-xl font-medium text-sm shadow-sm transition-colors">
        <ng-icon name="lucideArrowLeft" size="20"></ng-icon>
        <span>Back</span>
      </button>

      <div class="form-card p-6 md:p-8 rounded-2xl bg-white border-2 shadow-md hover:shadow-lg transition-shadow relative overflow-hidden" style="border-color: var(--accent)">
        <div class="relative z-10">
          <div class="mb-6">
            <div class="form-card-icon inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border-2 mb-4 shadow-sm">
              <ng-icon name="lucidePieChart" size="24"></ng-icon>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 mb-1">Create Budget</h1>
            <p class="text-slate-500 text-sm">Set a limit to keep your spending in check.</p>
          </div>

          <form [formGroup]="budgetForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div class="space-y-1.5">
              <label for="name" class="block text-xs font-bold tracking-wide uppercase text-slate-500 ml-1">Budget Name</label>
              <input type="text" id="name" formControlName="name" placeholder="e.g. Groceries, Rent, Utilities" 
                     class="w-full bg-white text-slate-800 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-(--accent) transition-all placeholder:text-slate-400" />
            </div>

            <div class="space-y-1.5">
              <label for="limit" class="block text-xs font-bold tracking-wide uppercase text-slate-500 ml-1">Monthly Limit (KES)</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-semibold text-sm form-currency-prefix">
                  KES
                </div>
                <input type="number" id="limit" formControlName="limit" placeholder="0" 
                       class="w-full bg-white text-slate-800 border-2 border-slate-200 rounded-xl pl-14 pr-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-(--accent) transition-all placeholder:text-slate-400" />
              </div>
              @if (budgetForm.get('limit')?.touched && budgetForm.get('limit')?.invalid) {
                <p class="text-red-500 text-xs font-medium ml-1 mt-1 animation-slide-down">Valid limit is required</p>
              }
            </div>

            <div class="space-y-1.5">
              <label for="category" class="block text-xs font-bold tracking-wide uppercase text-slate-500 ml-1">Category (Optional)</label>
              <select id="category" formControlName="categoryId" 
                      class="w-full bg-white text-slate-800 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-(--accent) transition-all appearance-none cursor-pointer">
                <option value="">No category (overall budget)</option>
                @for (cat of categories; track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="pt-2">
              <button type="submit" [disabled]="budgetForm.invalid || saving" 
                      class="w-full flex justify-center items-center gap-2 bg-white border-2 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold text-base transition-all duration-200" style="border-color: var(--accent); color: var(--accent)">
                @if (saving) {
                  <span class="animate-spin inline-block w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></span>
                  <span>Saving...</span>
                } @else {
                  <ng-icon name="lucideSave" size="20"></ng-icon>
                  <span>Save Budget</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animation-fade-in {
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animation-slide-down {
      animation: slideDown 0.3s ease-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .btn-back-unified { color: var(--accent); }
    .btn-back-unified:hover { background: var(--accent-dim); border-color: var(--accent) !important; }
    .form-card-icon { border-color: var(--accent); color: var(--accent); }
    .form-currency-prefix { color: var(--accent); }
  `]
})
export class BudgetCreateComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private router = inject(Router);

  budgetForm: FormGroup;
  categories: { id: string; name: string }[] = [];
  saving = false;

  constructor(private fb: FormBuilder) {
    this.budgetForm = this.fb.group({
      name: [''],
      limit: ['', [Validators.required, Validators.min(0.01)]],
      categoryId: ['']
    });
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.categories = Array.isArray(data) ? data : (data?.items ?? []);
      },
      error: () => this.toast.error('Could not load categories.')
    });
  }

  onSubmit() {
    if (this.budgetForm.invalid || this.saving) return;
    const v = this.budgetForm.value;
    const { startAt, endAt } = this.getMonthBounds();
    const payload = {
      limitAmount: Number(v.limit),
      period: 'month' as const,
      startAt,
      endAt,
      ...(v.categoryId ? { categoryId: v.categoryId } : {})
    };
    this.saving = true;
    this.budgetService.createBudget(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Budget created successfully.');
        this.router.navigate(['/budgets']);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not create budget. Please try again.'));
      }
    });
  }

  private getMonthBounds(): { startAt: string; endAt: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
  }
}

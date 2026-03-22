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
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-budget-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgIconComponent],
  viewProviders: [
    provideIcons({ lucideArrowLeft, lucideSave, lucidePieChart })
  ],
  template: `
    <div class="create-wrap fade-in">

      <button routerLink=".." class="btn-back">
        <ng-icon name="lucideArrowLeft" size="18"></ng-icon>
        Back
      </button>

      <div class="form-card slide-up">

        <!-- Icon + heading -->
        <div class="form-header">
          <div class="form-icon">
            <ng-icon name="lucidePieChart" size="22"></ng-icon>
          </div>
          <h1 class="form-title">Create Budget</h1>
          <p class="form-sub page-subtitle">Set a limit to keep your spending in check.</p>
        </div>

        <form [formGroup]="budgetForm" (ngSubmit)="onSubmit()" class="form-body">

          <!-- Budget name -->
          <div class="field">
            <label for="name" class="field-label">Budget Name</label>
            <input
              type="text"
              id="name"
              formControlName="name"
              placeholder="e.g. Groceries, Rent, Utilities"
              class="field-input"
            />
          </div>

          <!-- Monthly limit -->
          <div class="field">
            <label for="limit" class="field-label">Monthly Limit ({{ currencyService.currency() }})</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">{{ currencyService.currency() }}</span>
              <input
                type="number"
                id="limit"
                formControlName="limit"
                placeholder="0"
                class="field-input with-prefix"
              />
            </div>
            @if (budgetForm.get('limit')?.touched && budgetForm.get('limit')?.invalid) {
              <p class="field-error slide-down">Valid limit is required</p>
            }
          </div>

          <!-- Category -->
          <div class="field">
            <label for="category" class="field-label">Category (Optional)</label>
            <select id="category" formControlName="categoryId" class="field-input field-select">
              <option value="">No category (overall budget)</option>
              @for (cat of categories; track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <!-- Submit -->
          <button type="submit" class="btn-submit" [disabled]="budgetForm.invalid || saving">
            @if (saving) {
              <span class="btn-spinner"></span>
              Saving…
            } @else {
              <ng-icon name="lucideSave" size="18"></ng-icon>
              Save Budget
            }
          </button>

        </form>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────────── */
    .create-wrap {
      max-width: 560px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .fade-in  { animation: fadeIn  0.45s cubic-bezier(0.16,1,0.3,1) both; }
    .slide-up { animation: slideUp 0.5s  cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.05s; }
    .slide-down { animation: slideDown 0.3s ease-out both; }
    @keyframes fadeIn   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    @keyframes slideUp  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

    /* ── Back button ─────────────────────────────────────────── */
    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
      padding: 0.55rem 1.1rem;
      background: var(--surface);
      border: 1px solid var(--border-medium);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .btn-back:hover { background: var(--surface-raised); border-color: var(--accent); color: var(--accent); }

    /* ── Card ────────────────────────────────────────────────── */
    .form-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      overflow: hidden;
      box-shadow:
        rgba(50,50,93,0.15) 0px 30px 60px -15px,
        rgba(0,0,0,0.18) 0px 18px 36px -18px;
    }

    /* ── Header ──────────────────────────────────────────────── */
    .form-header {
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .form-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--accent-dim);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      border: 1px solid var(--accent-glow);
    }
    .form-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.02em;
    }
    .form-sub { margin: 0; font-size: 0.9rem; }

    /* ── Form body ───────────────────────────────────────────── */
    .form-body {
      padding: 1.75rem 2rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-primary);
      opacity: 0.55;
    }
    .field-input {
      width: 100%;
      padding: 0.7rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border-medium);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.95rem;
      font-weight: 500;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-input::placeholder { color: var(--text-primary); opacity: 0.3; }
    .field-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .field-select { appearance: none; cursor: pointer; }
    .field-select option { background: var(--card-bg); color: var(--text-primary); }

    /* Prefix input */
    .input-prefix-wrap { position: relative; }
    .input-prefix {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent);
      pointer-events: none;
    }
    .with-prefix { padding-left: 3.5rem; }

    .field-error {
      font-size: 0.78rem;
      font-weight: 600;
      color: #f87171;
      margin: 0;
    }

    /* ── Submit button ───────────────────────────────────────── */
    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.8rem 1.5rem;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: 0.5rem;
      box-shadow: 0 4px 14px rgba(34,197,94,0.35);
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34,197,94,0.4); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Responsive ──────────────────────────────────────────── */
    @media (max-width: 640px) {
      .create-wrap { padding: 1.5rem 1rem; }
      .form-header { padding: 1.5rem 1.25rem 1.25rem; }
      .form-body { padding: 1.25rem; }
    }
  `]
})
export class BudgetCreateComponent implements OnInit {
  protected currencyService = inject(CurrencyService);
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
      next: (res) => { this.categories = res?.data ?? []; },
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
    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }
}

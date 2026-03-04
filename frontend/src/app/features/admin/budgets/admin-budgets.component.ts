import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucidePlus, 
  lucidePieChart, 
  lucideTrendingDown,
  lucideAlertCircle,
  lucideCheckCircle2,
  lucideMoreVertical,
  lucideLoader2
} from '@ng-icons/lucide';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-budgets',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucidePlus, 
      lucidePieChart, 
      lucideTrendingDown,
      lucideAlertCircle,
      lucideCheckCircle2,
      lucideMoreVertical,
      lucideLoader2
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Budgets Management</h1>
          <p class="admin-subtitle">Track and manage allocated budgets across categories</p>
        </div>
        <div class="admin-actions">
          <button class="btn-primary">
            <ng-icon name="lucidePlus"></ng-icon> Create Budget
          </button>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <ng-icon name="lucideLoader2" class="spinner"></ng-icon>
        <p>Loading budgets...</p>
      </div>

      <div *ngIf="!isLoading" class="budgets-grid">
        <div class="fin-card-elevated budget-card slide-up" *ngFor="let budget of budgets; let i = index" [style.animation-delay]="i * 0.1 + 's'">
          <div class="card-header">
            <div class="budget-icon" [ngClass]="budget.theme">
              <ng-icon [name]="budget.icon"></ng-icon>
            </div>
            <button class="btn-icon">
              <ng-icon name="lucideMoreVertical"></ng-icon>
            </button>
          </div>
          
          <div class="budget-info">
            <h3 class="budget-name">{{ budget.name }}</h3>
            <p class="budget-meta">Assigned to: <strong>{{ budget.department }}</strong></p>
          </div>

          <div class="budget-amounts">
            <div class="amount-group">
              <span class="amount-label">Spent</span>
              <span class="amount-value">{{ budget.spent | currency:'KES':'symbol':'1.0-0' }}</span>
            </div>
            <div class="amount-divider"></div>
            <div class="amount-group text-right">
              <span class="amount-label">Total Limit</span>
              <span class="amount-value text-muted">{{ budget.total | currency:'KES':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-text" [ngClass]="budget.statusClass">{{ budget.percentage }}% Used</span>
              <span class="status-badge" [ngClass]="budget.statusClass">
                <ng-icon [name]="budget.statusIcon"></ng-icon>
                {{ budget.statusText }}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [ngClass]="budget.theme" [style.width]="budget.percentage + '%'"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2.5rem; max-width: 1400px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .admin-title { font-size: 2.25rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0; letter-spacing: -0.03em; }
    .admin-subtitle { color: rgba(255,255,255,0.6); margin: 0; font-size: 1.1rem; }
    .admin-actions { display: flex; gap: 1rem; }

    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 0.95rem; border: none; background: var(--accent, #3b82f6); color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 0;
      color: var(--text-secondary, #6b7280);
    }
    .spinner {
      font-size: 2.5rem;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
      color: var(--accent, #3b82f6);
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .budgets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }

    .fin-card-elevated {
      background: var(--card-bg, #ffffff); border-radius: 24px; padding: 1.75rem;
      /* MANDATORY Box-shadow */
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, 
                  rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, 
                  rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .fin-card-elevated:hover { transform: translateY(-6px); }

    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
    .budget-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    
    .theme-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .theme-blue-fill { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
    .theme-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
    .theme-purple-fill { background: linear-gradient(90deg, #c084fc, #9333ea); }
    .theme-green { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
    .theme-green-fill { background: linear-gradient(90deg, #4ade80, #16a34a); }
    .theme-orange { background: rgba(249, 115, 22, 0.1); color: #ea580c; }
    .theme-orange-fill { background: linear-gradient(90deg, #fb923c, #ea580c); }

    .btn-icon { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary, #6b7280); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; margin: -0.5rem -0.5rem 0 0; }
    .btn-icon:hover { background: var(--surface-hover, #e5e7eb); color: var(--text-primary, #111827); }

    .budget-info { margin-bottom: 1.5rem; }
    .budget-name { font-size: 1.2rem; font-weight: 700; color: white; margin: 0 0 0.25rem 0; }
    .budget-meta { font-size: 0.85rem; color: rgba(255,255,255,0.55); margin: 0; }

    .budget-amounts { display: flex; align-items: center; justify-content: space-between; background: var(--surface-alt, #f9fafb); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; }
    .amount-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .amount-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.45); letter-spacing: 0.05em; }
    .amount-value { font-size: 1.15rem; font-weight: 700; color: white; }
    .text-muted { color: var(--text-secondary, #6b7280); }
    .text-right { text-align: right; }
    .amount-divider { width: 1px; height: 30px; background: var(--border-medium, #e5e7eb); }

    .progress-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; }
    .progress-text { font-size: 0.9rem; font-weight: 700; }
    
    .status-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 6px; }
    .status-ok { color: #16a34a; background: rgba(34, 197, 94, 0.1); }
    .status-warn { color: #d97706; background: rgba(245, 158, 11, 0.1); }
    .status-danger { color: #dc2626; background: rgba(239, 68, 68, 0.1); }

    .progress-track { width: 100%; height: 8px; background: var(--surface-hover, #e5e7eb); border-radius: 999px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 999px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class AdminBudgetsComponent implements OnInit {
  private adminService = inject(AdminService);

  budgets: any[] = [];
  isLoading = true;

  ngOnInit() {
    this.fetchBudgets();
  }

  fetchBudgets() {
    this.adminService.getBudgets(1, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.budgets = res.data.map((b: any, index: number) => {
            const name = b.category?.name || 'General Budget';
            const department = b.user?.name || 'Unknown User';
            const spent = b.totalSpent || 0; // Might not be returned by default Admin endpoint, map as 0 if absent
            const total = b.amount || b.limit || 0;
            
            // Calculate percentage safely
            let percentage = 0;
            if (total > 0) {
              percentage = Math.round((spent / total) * 100);
            }
            if (percentage > 100) percentage = 100; // Cap visual at 100% or allow over

            // Determine status
            let statusText = 'On Track';
            let statusClass = 'status-ok';
            let statusIcon = 'lucideCheckCircle2';

            if (percentage >= 100) {
              statusText = 'Over Budget';
              statusClass = 'status-danger';
              statusIcon = 'lucideAlertCircle';
            } else if (percentage >= 80) {
              statusText = 'Near Limit';
              statusClass = 'status-warn';
              statusIcon = 'lucideAlertCircle';
            }

            // Assign themes cyclically
            const themes = [
              'theme-blue theme-blue-fill', 
              'theme-orange theme-orange-fill', 
              'theme-green theme-green-fill', 
              'theme-purple theme-purple-fill'
            ];
            const theme = themes[index % themes.length];

            return {
              id: b.id,
              name,
              department,
              spent,
              total,
              percentage,
              icon: percentage >= 100 ? 'lucideTrendingDown' : 'lucidePieChart',
              theme,
              statusText,
              statusClass,
              statusIcon
            };
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch budgets', err);
        this.isLoading = false;
      }
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucidePlus, 
  lucideTarget, 
  lucideTrophy,
  lucideClock,
  lucideStar,
  lucideLoader2
} from '@ng-icons/lucide';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-goals',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucidePlus, 
      lucideTarget, 
      lucideTrophy,
      lucideClock,
      lucideStar,
      lucideLoader2
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Strategic Goals</h1>
          <p class="admin-subtitle">Company OKRs and user financial milestones</p>
        </div>
        <div class="admin-actions">
          <button class="btn-primary">
            <ng-icon name="lucidePlus"></ng-icon> New Goal
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <ng-icon name="lucideLoader2" class="spin-icon"></ng-icon>
        <p>Loading goals...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && goals.length === 0" class="empty-state">
        <div class="empty-icon">
          <ng-icon name="lucideTarget"></ng-icon>
        </div>
        <h3>No Goals Found</h3>
        <p>There are currently no goals available.</p>
      </div>

      <!-- Goals Grid -->
      <div *ngIf="!loading && goals.length > 0" class="goals-grid">
        <div class="fin-card-elevated goal-card slide-up" *ngFor="let goal of goals; let i = index" [style.animation-delay]="i * 0.1 + 's'">
          <div class="goal-layout">
            
            <div class="goal-details">
              <div class="goal-header">
                <span class="goal-badge" [ngClass]="goal.typeClass">
                  <ng-icon [name]="goal.icon"></ng-icon>
                  {{ goal.type }}
                </span>
                <span class="goal-deadline">
                  <ng-icon name="lucideClock"></ng-icon> {{ goal.deadline }}
                </span>
              </div>
              <h3 class="goal-title">{{ goal.title }}</h3>
              <p class="goal-desc">{{ goal.description }}</p>
              
              <div class="goal-stats">
                <div class="stat">
                  <span class="stat-label">Current</span>
                  <span class="stat-value">{{ goal.current | currency:'KES':'symbol':'1.0-0' }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat">
                  <span class="stat-label">Target</span>
                  <span class="stat-value">{{ goal.target | currency:'KES':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </div>

            <div class="goal-progress-circle">
              <svg viewBox="0 0 36 36" class="circular-chart" [ngClass]="goal.colorClass">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle"
                  [attr.stroke-dasharray]="goal.percentage + ', 100'"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{{ goal.percentage }}%</text>
              </svg>
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
    
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 0.95rem; border: none; background: var(--accent, #3b82f6); color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      background: var(--card-bg, #ffffff);
      border-radius: 24px;
      border: 1px dashed var(--border-medium, #e5e7eb);
      color: var(--text-secondary, #6b7280);
      margin-top: 2rem;
    }
    .spin-icon { font-size: 2rem; animation: spin 1s linear infinite; margin-bottom: 1rem; color: var(--accent, #3b82f6); }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .empty-icon { font-size: 3rem; color: var(--text-muted, #9ca3af); margin-bottom: 1rem; }
    .empty-state h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary, #111827); margin: 0 0 0.5rem 0; }
    .empty-state p { margin: 0; }

    .goals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; }

    .fin-card-elevated {
      background: var(--card-bg, #ffffff); border-radius: 24px; padding: 2rem;
      /* MANDATORY Box-shadow */
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, 
                  rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, 
                  rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .fin-card-elevated:hover { transform: translateY(-6px); }

    .goal-layout { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
    .goal-details { flex: 1; }

    .goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .goal-badge { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.375rem 0.75rem; border-radius: 999px; }
    
    .type-revenue { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
    .type-saving { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .type-expansion { background: rgba(168, 85, 247, 0.1); color: #a855f7; }

    .goal-deadline { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted, #9ca3af); }

    .goal-title { font-size: 1.4rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0; letter-spacing: -0.02em; }
    .goal-desc { font-size: 0.95rem; color: rgba(255,255,255,0.6); margin: 0 0 1.5rem 0; line-height: 1.5; }

    .goal-stats { display: flex; align-items: center; background: var(--surface-alt, #f9fafb); padding: 1rem 1.25rem; border-radius: 12px; display: inline-flex; gap: 1.5rem; }
    .stat { display: flex; flex-direction: column; gap: 0.25rem; }
    .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.45); letter-spacing: 0.05em; }
    .stat-value { font-size: 1.25rem; font-weight: 700; color: white; }
    .stat-divider { width: 1px; height: 30px; background: var(--border-medium, #e5e7eb); }

    /* Circular Progress Chart */
    .goal-progress-circle { width: 120px; height: 120px; flex-shrink: 0; }
    .circular-chart { display: block; margin: 0 auto; max-width: 80%; max-height: 250px; }
    .circle-bg { fill: none; stroke: var(--surface-hover, #e5e7eb); stroke-width: 3.8; }
    .circle { fill: none; stroke-width: 2.8; stroke-linecap: round; animation: progress 1.5s ease-out forwards; }
    
    @keyframes progress { 0% { stroke-dasharray: 0 100; } }
    
    .percentage { fill: white; font-family: sans-serif; font-size: 0.5em; text-anchor: middle; font-weight: 800; }

    .color-green .circle { stroke: #16a34a; }
    .color-blue .circle { stroke: #3b82f6; }
    .color-purple .circle { stroke: #a855f7; }

    @media (max-width: 768px) {
      .goal-layout { flex-direction: column-reverse; align-items: flex-start; }
      .goal-stats { width: 100%; justify-content: space-between; }
      .goal-progress-circle { width: 80px; height: 80px; align-self: flex-end; margin-bottom: -100px; }
    }
  `]
})
export class AdminGoalsComponent implements OnInit {
  private adminService = inject(AdminService);
  
  loading = true;
  goals: any[] = [];

  ngOnInit() {
    this.fetchGoals();
  }

  fetchGoals() {
    this.loading = true;
    this.adminService.getGoals().subscribe({
      next: (res) => {
        const rawGoals = res.data || [];
        this.goals = rawGoals.map((g: any) => {
          const target = Number(g.targetAmount) || 0;
          const current = Number(g.currentAmount) || 0;
          let percentage = target > 0 ? Math.round((current / target) * 100) : 0;
          if (percentage > 100) percentage = 100;

          let colorClass = 'color-blue';
          if (percentage >= 100) colorClass = 'color-green';
          else if (percentage < 30) colorClass = 'color-purple';

          let deadlineStr = 'No deadline';
          if (g.deadline) {
            const d = new Date(g.deadline);
            deadlineStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }

          return {
            title: g.name || g.title || 'Untitled Goal',
            description: g.description || `Goal by ${g.user?.name || 'User'}`,
            type: g.type || 'Goal',
            typeClass: 'type-saving',
            icon: 'lucideTarget',
            deadline: deadlineStr,
            current: current,
            target: target,
            percentage: percentage,
            colorClass: colorClass
          };
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load goals', err);
        this.loading = false;
        // Optionally display an error toast here
      }
    });
  }
}


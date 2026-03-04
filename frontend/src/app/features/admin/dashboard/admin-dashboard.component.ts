import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AdminService } from '../../../core/services/admin.service';
import { 
  lucideUsers, 
  lucideDollarSign, 
  lucideTarget, 
  lucidePieChart, 
  lucideTrendingUp, 
  lucideActivity,
  lucideArrowUpRight,
  lucideArrowDownRight,
  lucideCreditCard
} from '@ng-icons/lucide';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideUsers,
      lucideDollarSign,
      lucideTarget,
      lucidePieChart,
      lucideTrendingUp,
      lucideActivity,
      lucideArrowUpRight,
      lucideArrowDownRight,
      lucideCreditCard
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Platform Overview</h1>
          <p class="admin-subtitle">Monitor key metrics and system health</p>
        </div>
        <div class="admin-actions">
          <button class="btn-primary">
            <ng-icon name="lucideTrendingUp"></ng-icon> Generate Report
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading dashboard...</p>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid" *ngIf="!isLoading">
        <div class="metric-card fin-card-elevated" *ngFor="let stat of stats">
          <div class="metric-header">
            <span class="metric-title">{{ stat.title }}</span>
            <div class="metric-icon" [ngClass]="stat.typeClass">
              <ng-icon [name]="stat.icon"></ng-icon>
            </div>
          </div>
          <div class="metric-value">{{ stat.value }}</div>
          <div class="metric-trend" *ngIf="stat.trend" [ngClass]="stat.trendClass || 'neutral'">
            <ng-icon *ngIf="stat.trendIcon" [name]="stat.trendIcon"></ng-icon>
            <span>{{ stat.trend }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity & Charts -->
      <div class="content-grid">
        <div class="chart-section fin-card-elevated">
          <h2 class="section-title">Revenue Overview</h2>
          <div class="chart-placeholder">
            <div class="chart-bars">
              <div class="bar" style="height: 40%"></div>
              <div class="bar" style="height: 60%"></div>
              <div class="bar" style="height: 35%"></div>
              <div class="bar" style="height: 80%"></div>
              <div class="bar" style="height: 50%"></div>
              <div class="bar" style="height: 90%"></div>
              <div class="bar" style="height: 75%"></div>
            </div>
          </div>
        </div>

        <div class="activity-section fin-card-elevated">
          <h2 class="section-title">Recent Activity</h2>
          <div class="activity-list">
            <div class="activity-item" *ngFor="let item of recentActivity">
              <div class="activity-icon" [ngClass]="item.typeClass">
                <ng-icon [name]="item.icon"></ng-icon>
              </div>
              <div class="activity-details">
                <p class="activity-text">{{ item.text }}</p>
                <span class="activity-time">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
      grid-column: 1 / -1;
    }

    .spinner {
      border: 3px solid var(--border-subtle);
      border-top: 3px solid var(--accent);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .admin-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .fade-in {
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2.5rem;
    }

    .admin-title {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }

    .admin-subtitle {
      color: rgba(255,255,255,0.6);
      margin: 0;
      font-size: 1.1rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
    }

    /* Elevated Card Style - Expensify Inspired */
    .fin-card-elevated {
      background: var(--card-bg);
      border-radius: 20px;
      padding: 1.75rem;
      /* MANDATORY Box-shadow */
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, 
                  rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, 
                  rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .fin-card-elevated:hover {
      transform: translateY(-4px);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .metric-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: rgba(255,255,255,0.55);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .bg-green-dim { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .bg-blue-dim { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .bg-purple-dim { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
    .bg-teal-dim { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }

    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 0.75rem;
      letter-spacing: -0.03em;
    }

    .metric-trend {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .metric-trend.positive { color: #22c55e; }
    .metric-trend.negative { color: #ef4444; }
    .metric-trend.neutral { color: var(--text-muted); }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: white;
      margin: 0 0 1.5rem 0;
    }

    /* Chart Placeholder Styles */
    .chart-placeholder {
      height: 300px;
      display: flex;
      align-items: flex-end;
      padding-top: 2rem;
      border-bottom: 1px dashed var(--border-medium);
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 0 1rem;
    }

    .bar {
      width: 40px;
      background: linear-gradient(to top, var(--accent-dim), var(--accent));
      border-radius: 6px 6px 0 0;
      opacity: 0.8;
      transition: opacity 0.2s, height 1s ease-out;
      animation: growUp 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes growUp {
      from { height: 0; }
    }

    .bar:hover {
      opacity: 1;
    }

    /* Activity List Styles */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 12px;
      transition: background-color 0.2s;
    }

    .activity-item:hover {
      background: var(--surface-alt);
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .activity-text {
      margin: 0;
      font-size: 0.95rem;
      color: white;
    }

    .activity-time {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.45);
      margin-top: 0.25rem;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  
  isLoading = true;
  stats: any[] = [];
  
  recentActivity = [
    { text: 'New user registration: Sarah M.', time: '2 mins ago', icon: 'lucideUsers', typeClass: 'bg-green-dim' },
    { text: 'Large transaction processed (KSh 12k)', time: '15 mins ago', icon: 'lucideDollarSign', typeClass: 'bg-blue-dim' },
    { text: 'System backup completed', time: '1 hour ago', icon: 'lucideActivity', typeClass: 'bg-teal-dim' },
    { text: 'New savings goal created', time: '3 hours ago', icon: 'lucideTarget', typeClass: 'bg-purple-dim' },
    { text: 'Subscription upgraded to Pro', time: '5 hours ago', icon: 'lucideCreditCard', typeClass: 'bg-green-dim' }
  ];

  ngOnInit() {
    this.adminService.getDashboard().subscribe({
      next: (response) => {
        const data = response.data;
        this.stats = [
          {
            title: 'Total Users',
            value: data.totalUsers.toLocaleString(),
            icon: 'lucideUsers',
            typeClass: 'bg-green-dim',
            trend: `${data.recentSignups} recent signups`,
            trendIcon: 'lucideArrowUpRight',
            trendClass: 'positive'
          },
          {
            title: 'Total Transactions',
            value: data.totalTransactions.toLocaleString(),
            icon: 'lucideDollarSign',
            typeClass: 'bg-blue-dim'
          },
          {
            title: 'Total Budgets',
            value: data.totalBudgets.toLocaleString(),
            icon: 'lucidePieChart',
            typeClass: 'bg-teal-dim'
          },
          {
            title: 'Active Goals',
            value: data.totalGoals.toLocaleString(),
            icon: 'lucideTarget',
            typeClass: 'bg-purple-dim'
          }
        ];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching dashboard stats', err);
        this.isLoading = false;
        this.stats = [];
      }
    });
  }
}

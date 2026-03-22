import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import {
  lucideUsers,
  lucideDollarSign,
  lucideTarget,
  lucidePieChart,
  lucideTrendingUp,
  lucideActivity,
  lucideArrowUpRight,
  lucideBrain,
  lucideCheckCircle,
  lucideAlertCircle,
} from '@ng-icons/lucide';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

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
      lucideBrain,
      lucideCheckCircle,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Platform Overview</h1>
          <p class="admin-subtitle">Monitor key metrics and system health</p>
        </div>
      </div>

      @if (isLoading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      }

      @if (!isLoading) {
        <div class="metrics-grid">
          @for (stat of stats; track $index) {
            <div class="metric-card fin-card-elevated">
              <div class="metric-header">
                <span class="metric-title">{{ stat.title }}</span>
                <div class="metric-icon" [ngClass]="stat.typeClass">
                  <ng-icon [name]="stat.icon"></ng-icon>
                </div>
              </div>
              <div class="metric-value">{{ stat.value }}</div>
              @if (stat.trend) {
                <div class="metric-trend" [ngClass]="stat.trendClass || 'neutral'">
                  @if (stat.trendIcon) {
                    <ng-icon [name]="stat.trendIcon"></ng-icon>
                  }
                  <span>{{ stat.trend }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="content-grid">
          <div class="chart-section fin-card-elevated">
            <h2 class="section-title">Platform Activity (Last 6 Months)</h2>
            <div class="chart-container">
              <canvas #activityChart></canvas>
            </div>
          </div>

          <div class="activity-section fin-card-elevated">
            <h2 class="section-title">Platform Summary</h2>
            <div class="summary-list">
              @for (item of summaryItems; track $index) {
                <div class="summary-item">
                  <div class="summary-icon" [ngClass]="item.typeClass">
                    <ng-icon [name]="item.icon"></ng-icon>
                  </div>
                  <div class="summary-details">
                    <p class="summary-label">{{ item.label }}</p>
                    <span class="summary-value">{{ item.value }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ML Retrain Card -->
        <div class="ml-card fin-card-elevated" style="margin-top: 1.5rem;">
          <div class="ml-card-inner">
            <div class="ml-icon-wrap">
              <ng-icon name="lucideBrain" size="24"></ng-icon>
            </div>
            <div class="ml-info">
              <h3 class="ml-title">ML Categorisation Model</h3>
              <p class="ml-desc">Retrain the model using all accumulated user-correction feedback to improve automatic category suggestions.</p>
              @if (retrainStatus) {
                <div class="ml-status">
                  <ng-icon [name]="retrainStatus === 'success' ? 'lucideCheckCircle' : 'lucideAlertCircle'" size="16"></ng-icon>
                  <span>{{ retrainMessage }}</span>
                </div>
              }
            </div>
            <button
              class="btn-retrain"
              (click)="triggerRetrain()"
              [disabled]="retraining">
              {{ retraining ? 'Retraining…' : 'Retrain Model' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: rgba(255, 255, 255, 0.72);
    }
    :host-context(html.light) .loading-state {
      color: rgba(22, 56, 50, 0.68);
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
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .admin-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .admin-title { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0; letter-spacing: -0.02em; }
    .admin-subtitle { margin: 0; font-size: 1.1rem; line-height: 1.45; color: #a3c4ad !important; }
    .fin-card-elevated {
      background: var(--card-bg);
      border-radius: 20px;
      padding: 1.75rem;
      box-shadow: rgba(50,50,93,0.25) 0px 50px 100px -20px, rgba(0,0,0,0.3) 0px 30px 60px -30px, rgba(10,37,64,0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .fin-card-elevated:hover { transform: translateY(-4px); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .metric-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      opacity: 0.72;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
    .bg-green-dim { background: rgba(34,197,94,0.15); color: #22c55e; }
    .bg-sage-dim { background: rgba(142, 182, 155, 0.18); color: #8EB69B; }
    /* Goals — brand green (matches user dashboard Active Goals) */
    .bg-goals-dim {
      background: rgba(34, 197, 94, 0.14);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.28);
    }
    .bg-teal-dim { background: rgba(20,184,166,0.15); color: #14b8a6; }
    .metric-value { font-size: 2.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; letter-spacing: -0.03em; }
    .metric-trend { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }
    .metric-trend.positive { color: #22c55e; }
    .metric-trend.neutral { color: rgba(255, 255, 255, 0.55); }
    :host-context(html.light) .metric-trend.neutral { color: rgba(22, 56, 50, 0.5); }
    .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
    @media (max-width: 1024px) { .content-grid { grid-template-columns: 1fr; } }
    .section-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0; letter-spacing: -0.01em; }
    .chart-container { height: 320px; }
    .summary-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .summary-item { display: flex; gap: 1rem; padding: 0.75rem; border-radius: 12px; transition: background-color 0.2s; }
    .summary-item:hover { background: var(--surface-alt); }
    .summary-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .summary-details { display: flex; flex-direction: column; justify-content: center; }
    .summary-label { margin: 0; font-size: 0.85rem; color: var(--text-primary); opacity: 0.68; }
    .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem; }
    .ml-card { padding: 1.5rem 2rem; }
    .ml-card-inner { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .ml-icon-wrap { width: 52px; height: 52px; border-radius: 14px; background: rgba(34,197,94,0.15); color: #22c55e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ml-info { flex: 1; min-width: 200px; }
    .ml-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.35rem 0; }
    .ml-desc { font-size: 0.875rem; color: var(--text-primary); opacity: 0.75; margin: 0; }
    .ml-status { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); opacity: 0.75; }
    .btn-retrain { padding: 0.7rem 1.5rem; background: rgba(34,197,94,0.18); border: 1px solid rgba(34,197,94,0.45); color: #22c55e; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-retrain:hover:not(:disabled) { background: rgba(34,197,94,0.28); border-color: rgba(34,197,94,0.6); }
    .btn-retrain:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewChecked, OnDestroy {
  private adminService = inject(AdminService);

  @ViewChild('activityChart') chartRef!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  stats: any[] = [];
  summaryItems: any[] = [];

  private chart: Chart | null = null;
  private chartBuilt = false;
  private chartLabels: string[] = [];
  private chartTransactions: number[] = [];
  private chartUsers: number[] = [];

  // ML retrain
  retraining = false;
  retrainStatus: 'success' | 'error' | null = null;
  retrainMessage = '';

  ngOnInit() {
    forkJoin({
      dashboard: this.adminService.getDashboard(),
      monthly: this.adminService.getMonthlyStats(),
    }).subscribe({
      next: ({ dashboard, monthly }) => {
        const data = dashboard.data;
        this.stats = [
          {
            title: 'Total Users',
            value: data.totalUsers.toLocaleString(),
            icon: 'lucideUsers',
            typeClass: 'bg-green-dim',
            trend: `${data.recentSignups} in the last 7 days`,
            trendIcon: 'lucideArrowUpRight',
            trendClass: 'positive'
          },
          {
            title: 'Total Transactions',
            value: data.totalTransactions.toLocaleString(),
            icon: 'lucideDollarSign',
            typeClass: 'bg-sage-dim'
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
            typeClass: 'bg-goals-dim'
          }
        ];

        this.summaryItems = [
          { label: 'Total Users', value: data.totalUsers.toLocaleString(), icon: 'lucideUsers', typeClass: 'bg-green-dim' },
          { label: 'Total Transactions', value: data.totalTransactions.toLocaleString(), icon: 'lucideDollarSign', typeClass: 'bg-sage-dim' },
          { label: 'Total Budgets', value: data.totalBudgets.toLocaleString(), icon: 'lucidePieChart', typeClass: 'bg-teal-dim' },
          { label: 'Active Goals', value: data.totalGoals.toLocaleString(), icon: 'lucideTarget', typeClass: 'bg-goals-dim' },
          { label: 'Recent Signups (7d)', value: data.recentSignups.toLocaleString(), icon: 'lucideActivity', typeClass: 'bg-green-dim' },
        ];

        const monthlyData = monthly.data ?? [];
        this.chartLabels = monthlyData.map((m: any) => m.label);
        this.chartTransactions = monthlyData.map((m: any) => m.transactions);
        this.chartUsers = monthlyData.map((m: any) => m.users);

        this.isLoading = false;
        this.chartBuilt = false; // allow ngAfterViewChecked to build the chart
      },
      error: (err) => {
        console.error('Error fetching admin dashboard', err);
        this.isLoading = false;
      }
    });
  }

  ngAfterViewChecked() {
    if (!this.chartBuilt && this.chartRef?.nativeElement && this.chartLabels.length > 0) {
      this.chartBuilt = true;
      this.buildChart();
    }
  }

  buildChart() {
    if (!this.chartRef?.nativeElement) return;
    this.chart?.destroy();

    const isLight = document.documentElement.classList.contains('light');
    const tickColor = isLight ? 'rgba(5,31,32,0.55)' : 'rgba(218,241,222,0.55)';
    const gridColor = isLight ? 'rgba(5,31,32,0.07)' : 'rgba(218,241,222,0.07)';
    const legendColor = isLight ? 'rgba(5,31,32,0.8)' : 'rgba(218,241,222,0.8)';
    const tooltipBg = isLight ? 'rgba(255,255,255,0.97)' : 'rgba(5,31,32,0.95)';
    const tooltipTitle = isLight ? '#051F20' : '#DAF1DE';
    const tooltipBody = isLight ? 'rgba(5,31,32,0.7)' : 'rgba(218,241,222,0.75)';
    const tooltipBorder = isLight ? 'rgba(22,163,74,0.25)' : 'rgba(34,197,94,0.3)';

    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.chartLabels,
        datasets: [
          {
            label: 'Transactions',
            data: this.chartTransactions,
            backgroundColor: 'rgba(34,197,94,0.75)',
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(34,197,94,0.95)',
          },
          {
            label: 'New Users',
            data: this.chartUsers,
            backgroundColor: 'rgba(96,165,250,0.7)',
            borderColor: '#60a5fa',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(96,165,250,0.95)',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: gridColor },
            ticks: { color: tickColor, stepSize: 1, padding: 8, font: { size: 12 } }
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: { color: tickColor, padding: 8, font: { size: 12 } }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: legendColor,
              boxWidth: 10,
              boxHeight: 10,
              borderRadius: 4,
              useBorderRadius: true,
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 14,
            cornerRadius: 10,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
          }
        }
      }
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  triggerRetrain() {
    this.retraining = true;
    this.retrainStatus = null;
    this.adminService.retrainModel().subscribe({
      next: (res) => {
        this.retrainStatus = 'success';
        this.retrainMessage = res.message ?? 'Model retrained successfully.';
        this.retraining = false;
      },
      error: (err) => {
        this.retrainStatus = 'error';
        this.retrainMessage = err?.error?.message ?? 'Retraining failed. ML service may be unavailable.';
        this.retraining = false;
      }
    });
  }
}

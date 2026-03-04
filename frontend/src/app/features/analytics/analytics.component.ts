import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, timeout, catchError, of, finalize } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { toLocalDateString } from '../../core/utils/date.utils';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrendingUp,
  lucideTrendingDown,
  lucideActivity,
  lucideBarChart3,
  lucidePieChart,
  lucideDownload,
  lucideCalendar,
  lucideArrowRight,
  lucideZap,
  lucideTarget,
} from '@ng-icons/lucide';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, BaseChartDirective],
  providers: [
    provideIcons({
      lucideTrendingUp,
      lucideTrendingDown,
      lucideActivity,
      lucideBarChart3,
      lucidePieChart,
      lucideDownload,
      lucideCalendar,
      lucideArrowRight,
      lucideZap,
      lucideTarget,
    }),
    provideCharts(withDefaultRegisterables()),
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
})
export class AnalyticsComponent implements OnInit {
  private static readonly MONTHLY_TARGET_STORAGE_KEY = 'finanalytics_monthly_spending_target';
  private transactionService = inject(TransactionService);
  private analyticsService = inject(AnalyticsService);
  isLoading = true;
  /** Set when the summary API request failed (e.g. network or auth); show message and retry. */
  summaryLoadFailed = false;
  /** True when API returned but period has no income/expenses (so we can show "try All time" hint). */
  hasNoDataForPeriod = false;

  // Date range filter: summary + charts use this
  dateRange: '30days' | '6months' | 'year' | 'all' = '6months';

  // KPI cards (loaded from API)
  metrics = [
    { label: 'Total Revenue', value: 'KSh 124,563', trend: '+14.5%', isPositive: true },
    { label: 'Average Transaction', value: 'KSh 84', trend: '+2.1%', isPositive: true },
    { label: 'Active Subscriptions', value: '1,204', trend: '-1.4%', isPositive: false },
    { label: 'Expense Rate', value: '32.1%', trend: '-4.3%', isPositive: true }, // lower is better
  ];

  // Insights (loaded from analytics API or empty)
  insights: { title: string; description: string; type: string; icon: string }[] = [];

  // Monthly spending target (user-set, persisted in localStorage)
  monthlySpendingTarget: number | null = null;
  spendingTargetInput = '';

  /** Parse summary from API: handles { data: { totalIncome, ... } }, direct object, or snake_case. */
  private static parseSummary(raw: any): { totalIncome: number; totalExpenses: number; balance: number } {
    const s = raw?.data ?? raw ?? {};
    const income = Number(s.totalIncome ?? s.total_income ?? 0) || 0;
    const expenses = Number(s.totalExpenses ?? s.total_expenses ?? 0) || 0;
    const balance = Number(s.balance ?? 0) || (income - expenses);
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  private static severityToCard(severity: string): { type: string; icon: string } {
    switch (severity) {
      case 'warning':
        return { type: 'warning', icon: 'lucideZap' };
      case 'tip':
        return { type: 'success', icon: 'lucideTrendingUp' };
      default:
        return { type: 'info', icon: 'lucideActivity' };
    }
  }

  private static insightTypeToTitle(backendType: string): string {
    const map: Record<string, string> = {
      monthly_summary: 'This month',
      top_category: 'Top category',
      weekend_pattern: 'Spending pattern',
      category_spike: 'Spending spike',
      under_budget: 'Goal reached',
    };
    return map[backendType] ?? 'Insight';
  }

  // Revenue & Expenses Overview (Income vs Expenses — real data from API)
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Income',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#10b981',
        fill: 'origin',
        tension: 0.4,
        borderWidth: 3,
      },
      {
        data: [],
        label: 'Expenses',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#ef4444',
        fill: 'origin',
        tension: 0.4,
        borderWidth: 3,
      },
    ],
    labels: [],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6,
      },
    },
    scales: {
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
        },
        border: {
          dash: [4, 4],
        },
      },
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { family: "'Inter', sans-serif", size: 13 },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0f172a',
        bodyColor: '#475569',
        borderColor: 'rgba(226, 232, 240, 1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
        bodyFont: { family: "'Inter', sans-serif", size: 13 },
      },
    },
  };

  public lineChartType: ChartType = 'line';

  // Doughnut Chart (Expense Breakdown by category — real data from API)
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#14b8a6',
          '#f59e0b',
          '#3b82f6',
          '#10b981',
          '#ef4444',
        ],
        hoverBackgroundColor: [
          '#4f46e5',
          '#7c3aed',
          '#db2777',
          '#0d9488',
          '#d97706',
          '#2563eb',
          '#059669',
          '#dc2626',
        ],
        borderWidth: 2,
        borderColor: '#fff',
        hoverBorderColor: '#fff',
        hoverOffset: 2,
      },
    ],
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    spacing: 2,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 13 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0f172a',
        bodyColor: '#475569',
        borderColor: 'rgba(226, 232, 240, 1)',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed ?? 0;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            const formatted = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
            return `${label}: ${formatted} (${pct}%)`;
          },
        },
      },
    },
  };

  public doughnutChartType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';

  // Bar Chart (Monthly Performance: Target vs Actual from real data)
  public barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Target',
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        data: [],
        label: 'Actual',
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { family: "'Inter', sans-serif", size: 13 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0f172a',
        bodyColor: '#475569',
        borderColor: 'rgba(226, 232, 240, 1)',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
      },
    },
  };

  public barChartType: ChartType = 'bar';

  ngOnInit(): void {
    this.loadData();
    const isLightMode = document.documentElement.classList.contains('light');
    const textColor = isLightMode ? '#051F20' : '#DAF1DE';
    const gridColor = isLightMode ? 'rgba(5, 31, 32, 0.08)' : 'rgba(218, 241, 222, 0.1)';
    const tooltipBg = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 43, 38, 0.95)';
    const tooltipTitle = isLightMode ? '#051F20' : '#DAF1DE';
    const tooltipBody = isLightMode ? '#235347' : '#8EB69B';
    if (this.lineChartOptions?.scales) {
      if (this.lineChartOptions.scales['x']) {
        this.lineChartOptions.scales['x'].ticks = { ...this.lineChartOptions.scales['x'].ticks, color: textColor };
      }
      if (this.lineChartOptions.scales['y']) {
        this.lineChartOptions.scales['y'].ticks = { ...this.lineChartOptions.scales['y'].ticks, color: textColor };
        if (this.lineChartOptions.scales['y'].grid) {
          this.lineChartOptions.scales['y'].grid.color = gridColor;
        }
      }
    }
    if (this.lineChartOptions?.plugins?.legend?.labels) {
      this.lineChartOptions.plugins.legend.labels.color = textColor;
    }
    if (this.lineChartOptions?.plugins?.tooltip) {
      this.lineChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
      this.lineChartOptions.plugins.tooltip.titleColor = tooltipTitle;
      this.lineChartOptions.plugins.tooltip.bodyColor = tooltipBody;
    }
    if (this.barChartOptions?.scales) {
      if (this.barChartOptions.scales['x']) {
        this.barChartOptions.scales['x'].ticks = { ...this.barChartOptions.scales['x'].ticks, color: textColor };
      }
      if (this.barChartOptions.scales['y']) {
        this.barChartOptions.scales['y'].ticks = { ...this.barChartOptions.scales['y'].ticks, color: textColor };
        if (this.barChartOptions.scales['y'].grid) {
          this.barChartOptions.scales['y'].grid.color = gridColor;
        }
      }
    }
    if (this.barChartOptions?.plugins?.legend?.labels) {
      this.barChartOptions.plugins.legend.labels.color = textColor;
    }
    if (this.barChartOptions?.plugins?.tooltip) {
      this.barChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
      this.barChartOptions.plugins.tooltip.titleColor = tooltipTitle;
      this.barChartOptions.plugins.tooltip.bodyColor = tooltipBody;
    }
    if (this.doughnutChartOptions?.plugins?.legend?.labels) {
      this.doughnutChartOptions.plugins.legend.labels.color = textColor;
    }
    if (this.doughnutChartOptions?.plugins?.tooltip) {
      this.doughnutChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
      this.doughnutChartOptions.plugins.tooltip.titleColor = tooltipTitle;
      this.doughnutChartOptions.plugins.tooltip.bodyColor = tooltipBody;
    }
  }

  onDateRangeChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    const value = target.value as '30days' | '6months' | 'year' | 'all';
    if (value === this.dateRange) return;
    this.dateRange = value;
    this.loadData();
  }

  private getDateRangeForFilter(): {
    firstDay: Date;
    lastDay: Date;
    chartRanges: { label: string; dateFrom: string; dateTo: string }[];
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let firstDay: Date;
    const lastDay: Date = new Date(today);
    const chartRanges: { label: string; dateFrom: string; dateTo: string }[] = [];

    switch (this.dateRange) {
      case '30days': {
        // Exactly 30 days: one bucket; chart reuses main summary data
        firstDay = new Date(today);
        firstDay.setDate(firstDay.getDate() - 29);
        chartRanges.push({
          label: 'Last 30 Days',
          dateFrom: toLocalDateString(firstDay),
          dateTo: toLocalDateString(lastDay),
        });
        break;
      }
      case '6months':
        firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          chartRanges.push({
            label: start.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' }),
            dateFrom: toLocalDateString(start),
            dateTo: toLocalDateString(end),
          });
        }
        break;
      case 'year':
        firstDay = new Date(now.getFullYear(), 0, 1);
        for (let m = 0; m <= now.getMonth(); m++) {
          const start = new Date(now.getFullYear(), m, 1);
          const end = new Date(now.getFullYear(), m + 1, 0);
          chartRanges.push({
            label: start.toLocaleDateString('en-KE', { month: 'short' }),
            dateFrom: toLocalDateString(start),
            dateTo: toLocalDateString(end),
          });
        }
        break;
      case 'all': {
        firstDay = new Date(today.getFullYear() - 10, 0, 1);
        chartRanges.push({
          label: 'All time',
          dateFrom: toLocalDateString(firstDay),
          dateTo: toLocalDateString(lastDay),
        });
        break;
      }
      default:
        firstDay = new Date(today);
        firstDay.setDate(firstDay.getDate() - 30);
        chartRanges.push(
          { label: 'Last 30 Days', dateFrom: toLocalDateString(firstDay), dateTo: toLocalDateString(lastDay) }
        );
    }

    return { firstDay, lastDay, chartRanges };
  }

  loadData(): void {
    this.isLoading = true;
    this.summaryLoadFailed = false;
    this.hasNoDataForPeriod = false;
    const stored = localStorage.getItem(AnalyticsComponent.MONTHLY_TARGET_STORAGE_KEY);
    this.monthlySpendingTarget = stored ? Number(stored) : null;
    this.spendingTargetInput = this.monthlySpendingTarget != null ? String(this.monthlySpendingTarget) : '';

    const formatKES = (val: number) =>
      new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);

    const { firstDay, lastDay, chartRanges } = this.getDateRangeForFilter();
    const firstDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(firstDay);
    const lastDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(lastDay);

    const REQUEST_TIMEOUT_MS = 15000;
    const summary$ = this.transactionService.getSummary(firstDayStr, lastDayStr).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((err) => {
        console.warn('Analytics summary request failed', err);
        return of(null);
      }),
    );
    const byCategory$ = this.transactionService.getByCategory(firstDayStr, lastDayStr).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of({ data: [] })),
    );
    const insights$ = this.analyticsService.getInsights().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of({ success: true, data: [] })),
    );
    const useSummaryForChart = chartRanges.length === 1;
    // forkJoin([]) never emits; use of([]) when there are no period requests.
    const periodSummaries$ = useSummaryForChart
      ? of([])
      : forkJoin(
          chartRanges.map((r) =>
            this.transactionService.getSummary(r.dateFrom, r.dateTo).pipe(
              timeout(REQUEST_TIMEOUT_MS),
              catchError(() => of(null)),
            ),
          ),
        );

    forkJoin({
      summary: summary$,
      byCategory: byCategory$,
      insights: insights$,
      monthly: periodSummaries$,
    }).pipe(
      finalize(() => (this.isLoading = false)),
    ).subscribe({
      next: (result) => {
        this.summaryLoadFailed = result.summary == null;
        const { totalIncome: income, totalExpenses: expenses, balance } = AnalyticsComponent.parseSummary(result.summary);
        this.hasNoDataForPeriod = (income + expenses) === 0;
        this.metrics = [
          { label: 'Total Income', value: formatKES(income), trend: '', isPositive: true },
          { label: 'Total Expenses', value: formatKES(expenses), trend: '', isPositive: false },
          { label: 'Net Balance', value: formatKES(balance), trend: '', isPositive: balance >= 0 },
          {
            label: 'Expense Rate',
            value: income > 0 ? ((expenses / income) * 100).toFixed(1) + '%' : '0%',
            trend: '',
            isPositive: income > 0 && expenses / income < 0.8,
          },
        ];

        const rawByCategory = result.byCategory?.data ?? result.byCategory;
        const categories: any[] = Array.isArray(rawByCategory) ? rawByCategory : [];
        const palette = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#3b82f6','#10b981','#ef4444'];
        if (categories.length > 0) {
          this.doughnutChartData = {
            labels: categories.map((c: any) => c.name ?? 'Other'),
            datasets: [{
              data: categories.map((c: any) => Number(c.total ?? 0)),
              backgroundColor: categories.map((c: any, i: number) => c.color || palette[i % palette.length]),
              hoverBackgroundColor: categories.map((c: any, i: number) => c.color || palette[i % palette.length]),
              borderWidth: 2,
              borderColor: '#fff',
              hoverBorderColor: '#fff',
              hoverOffset: 2,
            }],
          };
        } else {
          this.doughnutChartData = {
            labels: ['No data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#e2e8f0'],
              hoverBackgroundColor: ['#cbd5e1'],
              borderWidth: 2,
              borderColor: '#fff',
              hoverBorderColor: '#fff',
              hoverOffset: 2,
            }],
          };
        }

        const rawInsights: any[] = result.insights?.data ?? result.insights ?? [];
        this.insights = rawInsights.map((i: any) => {
          const { type, icon } = AnalyticsComponent.severityToCard(i.severity ?? 'info');
          return {
            title: AnalyticsComponent.insightTypeToTitle(i.type),
            description: i.message,
            type,
            icon,
          };
        });

        const periodData = (result.monthly ?? []) as any[];
        const actuals = useSummaryForChart
          ? [expenses]
          : chartRanges.map((_, idx) => {
              const m = periodData[idx];
              const data = m?.data ?? m ?? {};
              return Number(data.totalExpenses ?? 0);
            });
        const incomeByPeriod = useSummaryForChart
          ? [income]
          : chartRanges.map((_, idx) => {
              const m = periodData[idx];
              const data = m?.data ?? m ?? {};
              return Number(data.totalIncome ?? 0);
            });
        const expensesByPeriod = useSummaryForChart
          ? [expenses]
          : chartRanges.map((_, idx) => {
              const m = periodData[idx];
              const data = m?.data ?? m ?? {};
              return Number(data.totalExpenses ?? 0);
            });

        this.lineChartData = {
          labels: chartRanges.map((r) => r.label),
          datasets: [
            { ...this.lineChartData.datasets[0], data: incomeByPeriod },
            { ...this.lineChartData.datasets[1], data: expensesByPeriod },
          ],
        };

        const targetVal = this.monthlySpendingTarget ?? 0;
        this.barChartData = {
          labels: chartRanges.map((r) => r.label),
          datasets: [
            {
              data: targetVal > 0 ? chartRanges.map(() => targetVal) : [],
              label: 'Target',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
              barPercentage: 0.6,
            },
            {
              data: actuals,
              label: 'Actual',
              backgroundColor: '#3b82f6',
              borderRadius: 4,
              barPercentage: 0.6,
            },
          ],
        };

        this.isLoading = false;
      },
      error: () => {},
    });
  }

  setSpendingTarget(): void {
    const raw = this.spendingTargetInput != null ? String(this.spendingTargetInput).replace(/\s/g, '') : '';
    const num = raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(num) || num < 0) return;
    this.monthlySpendingTarget = num;
    this.spendingTargetInput = String(num);
    localStorage.setItem(AnalyticsComponent.MONTHLY_TARGET_STORAGE_KEY, String(num));
    if (this.barChartData.labels?.length) {
      this.barChartData = {
        ...this.barChartData,
        datasets: [
          {
            ...this.barChartData.datasets[0],
            data: this.barChartData.labels.map(() => num),
            label: 'Target',
          },
          this.barChartData.datasets[1],
        ],
      };
    } else {
      this.loadData();
    }
  }

  clearSpendingTarget(): void {
    this.monthlySpendingTarget = null;
    this.spendingTargetInput = '';
    localStorage.removeItem(AnalyticsComponent.MONTHLY_TARGET_STORAGE_KEY);
    this.loadData();
  }

  get dateRangeLabel(): string {
    const labels: Record<string, string> = {
      '30days': 'Last 30 Days',
      '6months': 'Last 6 Months',
      'year': 'This Year',
      'all': 'All time',
    };
    return labels[this.dateRange] ?? 'Last 30 Days';
  }
}

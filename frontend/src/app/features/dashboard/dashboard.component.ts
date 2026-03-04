import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideWallet,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideTarget,
  lucideAlertCircle,
  lucideLightbulb,
  lucideArrowRight,
  lucideChevronRight
} from '@ng-icons/lucide';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { GoalService } from '../../core/services/goal.service';
import { toLocalDateString } from '../../core/utils/date.utils';
import { forkJoin, timeout, catchError, of, finalize } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, BaseChartDirective],
  providers: [
    provideIcons({
      lucideWallet,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideTarget,
      lucideAlertCircle,
      lucideLightbulb,
      lucideArrowRight,
      lucideChevronRight
    }),
    provideCharts(withDefaultRegisterables())
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private budgetService = inject(BudgetService);
  private goalService = inject(GoalService);

  // Date range filter for summary + Cash Flow chart
  dateRange: '30days' | '6months' | 'year' | 'all' = '6months';

  // Summary Cards Data
  totalBalance = 0;
  monthlyIncome = 0;
  monthlySpending = 0;
  activeGoalsCount = 0;
  goalsOnTrackCount = 0;
  goalsNeedAttentionCount = 0;
  isLoading = true;
  /** Set when summary API fails; show message and retry. */
  summaryLoadFailed = false;
  /** True when API returned but period has no income/expenses. */
  hasNoDataForPeriod = false;

  // Trend vs previous period (real data)
  balanceTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  spendingTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  incomeTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  trendComparisonLabel = 'from previous period';

  // Budget alerts + nudges (from GET /budgets/alerts) — always show feedback
  budgetAlerts: any[] = [];
  nudges: { id: string; type: string; message: string; severity: string }[] = [];

  // Goals Summary
  goals: any[] = [];

  // Insights
  insights = [
    { text: 'Keep up the good work saving towards your goals!', type: 'positive' },
    { text: 'Consider reviewing your recurring subscriptions.', type: 'suggestion' }
  ];

  // Cash Flow chart (real data: last 6 months income & expenses)
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Income',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 1)',
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
        fill: 'origin',
        tension: 0.4
      },
      {
        data: [],
        label: 'Expenses',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 1)',
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(239, 68, 68, 1)',
        fill: 'origin',
        tension: 0.4
      }
    ],
    labels: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.5
      }
    },
    scales: {
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        display: true,
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    }
  };

  public lineChartType: ChartType = 'line';

  // Doughnut Chart for Expenses Breakdown
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#3b82f6', // blue-500
          '#10b981', // emerald-500
          '#f59e0b', // amber-500
          '#6366f1', // indigo-500
          '#ef4444', // red-500
          '#8b5cf6',
          '#ec4899',
          '#14b8a6'
        ],
        hoverBackgroundColor: [
          '#2563eb',
          '#059669',
          '#d97706',
          '#4f46e5',
          '#dc2626',
          '#7c3aed',
          '#db2777',
          '#0d9488'
        ],
        borderWidth: 0
      }
    ]
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed ?? 0;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)} (${pct}%)`;
          }
        }
      }
    }
  };

  public doughnutChartType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';

  ngOnInit(): void {
    this.loadDashboardData();
  }

  onDateRangeChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    const value = target.value as '30days' | '6months' | 'year' | 'all';
    if (value === this.dateRange) return;
    this.dateRange = value;
    this.loadDashboardData();
  }

  private getDateRangeForFilter(): { firstDay: Date; lastDay: Date; chartRanges: { label: string; dateFrom: string; dateTo: string }[] } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let firstDay: Date;
    let lastDay: Date = new Date(today);
    const chartRanges: { label: string; dateFrom: string; dateTo: string }[] = [];

    switch (this.dateRange) {
      case '30days': {
        // Exactly 30 days: one bucket so we reuse the same summary as the cards (avoids extra API calls and date-range bugs)
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
        lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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
        lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
        firstDay = new Date(now.getFullYear() - 10, 0, 1);
        lastDay = new Date(today);
        chartRanges.push({
          label: 'All time',
          dateFrom: toLocalDateString(firstDay),
          dateTo: toLocalDateString(lastDay),
        });
        break;
      }
      default:
        firstDay = new Date(now.getFullYear() - 2, 0, 1);
        lastDay = new Date(today);
        for (let y = 0; y < 3; y++) {
          const yr = now.getFullYear() - 2 + y;
          chartRanges.push({
            label: String(yr),
            dateFrom: `${yr}-01-01`,
            dateTo: yr === now.getFullYear() ? toLocalDateString(lastDay) : `${yr}-12-31`,
          });
        }
        break;
    }

    return { firstDay, lastDay, chartRanges };
  }

  /** Parse summary from API: handles { data: { totalIncome, ... } }, direct object, or snake_case. */
  private static parseSummary(raw: any): { totalIncome: number; totalExpenses: number; balance: number } {
    const s = raw?.data ?? raw ?? {};
    const income = Number(s.totalIncome ?? s.total_income ?? 0) || 0;
    const expenses = Number(s.totalExpenses ?? s.total_expenses ?? 0) || 0;
    const balance = Number(s.balance ?? 0) || (income - expenses);
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  /** Previous period of same length for trend comparison; null for "all". */
  private getPreviousPeriodRange(): { dateFrom: string; dateTo: string; label: string } | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (this.dateRange) {
      case '30days': {
        const curFirst = new Date(today);
        curFirst.setDate(curFirst.getDate() - 30);
        const prevLast = new Date(curFirst);
        prevLast.setDate(prevLast.getDate() - 1);
        const prevFirst = new Date(prevLast);
        prevFirst.setDate(prevFirst.getDate() - 29);
        return {
          dateFrom: toLocalDateString(prevFirst),
          dateTo: toLocalDateString(prevLast),
          label: 'from previous 30 days',
        };
      }
      case '6months': {
        const prevEnd = new Date(now.getFullYear(), now.getMonth() - 6, 0);
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        return {
          dateFrom: toLocalDateString(prevStart),
          dateTo: toLocalDateString(prevEnd),
          label: 'from last 6 months',
        };
      }
      case 'year': {
        const prevYear = now.getFullYear() - 1;
        return {
          dateFrom: `${prevYear}-01-01`,
          dateTo: `${prevYear}-12-31`,
          label: 'from last year',
        };
      }
      case 'all':
      default:
        return null;
    }
  }

  private formatTrendPct(current: number, previous: number, lowerIsBetter = false): { text: string; isPositive: boolean } {
    if (previous == null || previous === 0) return { text: '—', isPositive: true };
    const pct = ((current - previous) / previous) * 100;
    const isPositive = lowerIsBetter ? pct <= 0 : pct >= 0;
    const sign = pct >= 0 ? '+' : '';
    return { text: `${sign}${pct.toFixed(1)}%`, isPositive };
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.summaryLoadFailed = false;
    this.hasNoDataForPeriod = false;

    const { firstDay, lastDay, chartRanges } = this.getDateRangeForFilter();
    const firstDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(firstDay);
    const lastDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(lastDay);

    const REQUEST_TIMEOUT_MS = 15000;
    const summary$ = this.transactionService.getSummary(firstDayStr, lastDayStr).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((err) => {
        console.warn('Dashboard summary request failed', err);
        return of(null);
      }),
    );
    const categories$ = this.transactionService.getByCategory(firstDayStr, lastDayStr).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of({ data: [] })),
    );
    const alerts$ = this.budgetService.getAlerts().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of({ data: { budgetAlerts: [], nudges: [] } })),
    );
    const goals$ = this.goalService.getGoals().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of({ data: [] })),
    );
    // For single-bucket ranges (e.g. 30 days) we use the main summary for the chart; no extra requests.
    // forkJoin([]) never emits, so use of([]) when there are no period requests.
    const monthlySummaries$ =
      chartRanges.length > 1
        ? forkJoin(
            chartRanges.map((r) =>
              this.transactionService.getSummary(r.dateFrom, r.dateTo).pipe(
                timeout(REQUEST_TIMEOUT_MS),
                catchError(() => of(null)),
              ),
            ),
          )
        : of([]);
    const prevRange = this.getPreviousPeriodRange();
    const previousSummary$ = prevRange
      ? this.transactionService.getSummary(prevRange.dateFrom, prevRange.dateTo).pipe(
          timeout(REQUEST_TIMEOUT_MS),
          catchError(() => of(null)),
        )
      : null;

    forkJoin({
      summary: summary$,
      categories: categories$,
      alerts: alerts$,
      goals: goals$,
      monthly: monthlySummaries$,
      ...(previousSummary$ ? { previousSummary: previousSummary$ } : {}),
    }).pipe(
      // Ensure loading is cleared even if next() throws (e.g. when processing malformed data)
      finalize(() => (this.isLoading = false)),
    ).subscribe({
      next: (results) => {
        try {
        this.summaryLoadFailed = results.summary == null;
        const { totalIncome: monthlyIncome, totalExpenses: monthlySpending, balance: totalBalance } = DashboardComponent.parseSummary(results.summary);
        this.totalBalance = totalBalance;
        this.monthlyIncome = monthlyIncome;
        this.monthlySpending = monthlySpending;
        this.hasNoDataForPeriod = (monthlyIncome + monthlySpending) === 0;

        if (prevRange && results.previousSummary != null) {
          const prev = results.previousSummary?.data ?? results.previousSummary ?? {};
          const prevBalance = prev.balance ?? 0;
          const prevIncome = prev.totalIncome ?? 0;
          const prevSpending = prev.totalExpenses ?? 0;
          this.trendComparisonLabel = prevRange.label;
          this.balanceTrend = this.formatTrendPct(this.totalBalance, prevBalance);
          this.incomeTrend = this.formatTrendPct(this.monthlyIncome, prevIncome);
          this.spendingTrend = this.formatTrendPct(this.monthlySpending, prevSpending, true);
        } else {
          this.trendComparisonLabel = 'from previous period';
          this.balanceTrend = { text: '—', isPositive: true };
          this.incomeTrend = { text: '—', isPositive: true };
          this.spendingTrend = { text: '—', isPositive: true };
        }

        const rawCategories = results.categories?.data ?? results.categories;
        const categoryData = Array.isArray(rawCategories) ? rawCategories : [];
        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
        if (categoryData.length > 0) {
          this.doughnutChartData = {
            labels: categoryData.map((c: any) => c.name ?? 'Other'),
            datasets: [{
              data: categoryData.map((c: any) => Number(c.total ?? 0)),
              backgroundColor: categoryData.map((c: any, i: number) => c.color ?? palette[i % palette.length]),
              hoverBackgroundColor: categoryData.map((c: any, i: number) => c.color ?? palette[i % palette.length]),
              borderWidth: 0,
            }],
          };
        } else {
          this.doughnutChartData = {
            labels: ['No expenses in period'],
            datasets: [{
              data: [0],
              backgroundColor: ['#e2e8f0'],
              hoverBackgroundColor: ['#cbd5e1'],
              borderWidth: 0,
            }],
          };
        }

        const alertsPayload = results.alerts?.data ?? results.alerts ?? {};
        const rawAlerts = alertsPayload.budgetAlerts ?? [];
        this.nudges = alertsPayload.nudges ?? [];
        this.budgetAlerts = rawAlerts.map((b: any) => {
          const limit = Number(b.limitAmount ?? b.limit ?? 0);
          const spent = Number(b.totalSpent ?? b.spent ?? 0);
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          let status = 'safe';
          if (pct >= 100) status = 'danger';
          else if (pct >= 80) status = 'warning';
          const label = b.category?.name ?? 'Overall';
          let feedback = '';
          if (status === 'danger') feedback = `You've exceeded your ${label} budget.`;
          else if (status === 'warning') feedback = `You've used ${Math.round(pct)}% of your ${label} budget — getting close to the limit.`;
          else feedback = `${label}: ${Math.round(pct)}% used.`;
          return {
            category: label,
            spent,
            budget: limit,
            percentage: Math.min(pct, 100),
            status,
            feedback,
          };
        });

        const goalsData = results.goals?.data ?? results.goals ?? [];
        this.goals = goalsData.slice(0, 3).map((g: any) => ({
          name: g.name,
          target: g.targetAmount ?? g.target ?? 0,
          current: g.currentAmount ?? g.current ?? 0,
        }));
        this.activeGoalsCount = goalsData.length;
        this.goalsOnTrackCount = goalsData.filter(
          (g: any) => g.status === 'on_track' || g.status === 'completed' || g.status === 'in_progress'
        ).length;
        this.goalsNeedAttentionCount = goalsData.filter(
          (g: any) => g.status === 'at_risk' || g.status === 'overdue'
        ).length;

        const chartData = (results.monthly ?? []) as any[];
        const useSummaryForChart = chartRanges.length === 1;
        const incomeByPeriod = useSummaryForChart
          ? [monthlyIncome]
          : chartRanges.map((_, i) => {
              const m = chartData[i];
              const d = m?.data ?? m ?? {};
              return Number(d.totalIncome ?? 0);
            });
        const expensesByPeriod = useSummaryForChart
          ? [monthlySpending]
          : chartRanges.map((_, i) => {
              const m = chartData[i];
              const d = m?.data ?? m ?? {};
              return Number(d.totalExpenses ?? 0);
            });
        this.lineChartData = {
          labels: chartRanges.map((r) => r.label),
          datasets: [
            { ...this.lineChartData.datasets[0], data: incomeByPeriod },
            { ...this.lineChartData.datasets[1], data: expensesByPeriod },
          ],
        };

        this.isLoading = false;
        } catch (e) {
          console.error('Error processing dashboard data', e);
        }
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
      },
    });
  }

  getGoalProgress(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  get dateRangeLabel(): string {
    const labels: Record<string, string> = {
      '30days': 'Last 30 Days',
      '6months': 'Last 6 Months',
      'year': 'This Year',
      'all': 'All Time',
    };
    return labels[this.dateRange] ?? 'Last 6 Months';
  }
}

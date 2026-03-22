import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  lucideChevronRight,
  lucideSparkles,
  lucideX,
  lucideLoader2,
} from '@ng-icons/lucide';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { GoalService } from '../../core/services/goal.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { toLocalDateString } from '../../core/utils/date.utils';
import { forkJoin, timeout, catchError, of, finalize } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, BaseChartDirective, CurrencyFormatPipe],
  providers: [
    provideIcons({
      lucideWallet,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideTarget,
      lucideAlertCircle,
      lucideLightbulb,
      lucideArrowRight,
      lucideChevronRight,
      lucideSparkles,
      lucideX,
      lucideLoader2,
    }),
    provideCharts(withDefaultRegisterables())
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);
  private currencyService = inject(CurrencyService);
  private budgetService = inject(BudgetService);
  private goalService = inject(GoalService);
  private analyticsService = inject(AnalyticsService);

  // Date range filter
  dateRange: '30days' | '6months' | 'year' | 'all' = '6months';

  // Loading states – separate initial vs. filter-change so charts don't disappear
  isInitialLoad = true;
  isLoading = true;
  isFilterUpdating = false;

  summaryLoadFailed = false;
  hasNoDataForPeriod = false;

  // Summary Cards
  totalBalance = 0;
  monthlyIncome = 0;
  monthlySpending = 0;
  activeGoalsCount = 0;
  goalsOnTrackCount = 0;
  goalsNeedAttentionCount = 0;

  // Trends
  balanceTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  spendingTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  incomeTrend: { text: string; isPositive: boolean } = { text: '—', isPositive: true };
  trendComparisonLabel = 'from previous period';

  // Budget alerts + nudges
  budgetAlerts: any[] = [];
  nudges: { id: string; type: string; message: string; severity: string }[] = [];
  private dismissedNudgeIds = new Set<string>();
  private readonly DISMISSED_KEY = 'dismissedNudges';

  // Goals
  goals: any[] = [];

  // Theme-aware chart observer
  private themeObserver: MutationObserver | null = null;

  // Smart Analysis / AI Insights
  insights: { text: string; type: string }[] = [];
  isInsightsLoading = false;
  insightsPanelOpen = false;
  insightsError = false;

  // Cash Flow chart
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Income',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 1)',
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(34, 197, 94, 1)',
        fill: 'origin',
        tension: 0.4
      },
      {
        data: [],
        label: 'Expenses',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
    scales: {
      y: {
        display: true,
        grid: { color: 'rgba(142,182,155,0.12)' },
        ticks: { color: 'rgba(218,241,222,0.6)', font: { size: 11 } }
      },
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: 'rgba(218,241,222,0.6)', font: { size: 11 } }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: 'rgba(218,241,222,0.8)', boxWidth: 12, padding: 16 }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(11,43,38,0.95)',
        titleColor: '#DAF1DE',
        bodyColor: 'rgba(218,241,222,0.75)',
        borderColor: 'rgba(142,182,155,0.3)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    }
  };

  public lineChartType: ChartType = 'line';

  // Doughnut chart
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#22c55e','#235347','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'],
      hoverBackgroundColor: ['#16a34a','#163832','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0d9488'],
      borderWidth: 0
    }]
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,43,38,0.95)',
        titleColor: '#DAF1DE',
        bodyColor: 'rgba(218,241,222,0.75)',
        borderColor: 'rgba(142,182,155,0.3)',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed ?? 0;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${this.currencyService.format(value)} (${pct}%)`;
          }
        }
      }
    }
  };

  public doughnutChartType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';

  private isLightTheme(): boolean {
    return document.documentElement.classList.contains('light');
  }

  private getChartColors() {
    const light = this.isLightTheme();
    return {
      tick:        light ? 'rgba(5,31,32,0.55)'    : 'rgba(218,241,222,0.6)',
      grid:        light ? 'rgba(5,31,32,0.08)'    : 'rgba(142,182,155,0.12)',
      legend:      light ? 'rgba(5,31,32,0.7)'     : 'rgba(218,241,222,0.8)',
      tooltipBg:   light ? 'rgba(255,255,255,0.97)': 'rgba(11,43,38,0.95)',
      tooltipTitle:light ? '#051F20'               : '#DAF1DE',
      tooltipBody: light ? 'rgba(5,31,32,0.6)'    : 'rgba(218,241,222,0.75)',
      tooltipBorder:light? 'rgba(5,31,32,0.12)'   : 'rgba(142,182,155,0.3)',
    };
  }

  private applyChartTheme(): void {
    const c = this.getChartColors();
    this.lineChartOptions = {
      ...this.lineChartOptions,
      scales: {
        y: { display: true, grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 } } },
        x: { display: true, grid: { display: false }, ticks: { color: c.tick, font: { size: 11 } } },
      },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: c.legend, boxWidth: 12, padding: 16 } },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody,
          borderColor: c.tooltipBorder, borderWidth: 1, padding: 12, boxPadding: 6, usePointStyle: true,
        },
      },
    };
    this.doughnutChartOptions = {
      ...this.doughnutChartOptions,
      plugins: {
        ...this.doughnutChartOptions?.plugins,
        tooltip: {
          ...(this.doughnutChartOptions?.plugins?.tooltip ?? {}),
          backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody,
          borderColor: c.tooltipBorder, borderWidth: 1, padding: 12, usePointStyle: true,
        },
      },
    };
  }

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem(this.DISMISSED_KEY);
      if (stored) this.dismissedNudgeIds = new Set(JSON.parse(stored));
    } catch { /* ignore */ }
    this.applyChartTheme();
    this.themeObserver = new MutationObserver(() => this.applyChartTheme());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
  }

  dismissNudge(id: string): void {
    this.dismissedNudgeIds.add(id);
    this.nudges = this.nudges.filter((n) => n.id !== id);
    try {
      localStorage.setItem(this.DISMISSED_KEY, JSON.stringify([...this.dismissedNudgeIds]));
    } catch { /* ignore */ }
  }

  onDateRangeChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    const value = target.value as '30days' | '6months' | 'year' | 'all';
    if (value === this.dateRange) return;
    this.dateRange = value;
    this.loadDashboardData();
  }

  openSmartAnalysis(): void {
    this.insightsPanelOpen = true;
    if (this.insights.length > 0) return; // already loaded
    this.isInsightsLoading = true;
    this.insightsError = false;
    this.analyticsService.getInsights().subscribe({
      next: (res) => {
        const data = res?.data ?? [];
        this.insights = data.map((ins: any) => ({
          text: ins.message,
          type: ins.severity === 'warning' ? 'negative' : ins.severity === 'tip' ? 'suggestion' : 'positive'
        }));
        if (this.insights.length === 0) {
          this.insights = [{ text: 'Great job! No issues detected in your recent spending patterns.', type: 'positive' }];
        }
        this.isInsightsLoading = false;
      },
      error: () => {
        this.insightsError = true;
        this.isInsightsLoading = false;
      }
    });
  }

  closeSmartAnalysis(): void {
    this.insightsPanelOpen = false;
  }

  private getDateRangeForFilter(): { firstDay: Date; lastDay: Date; chartRanges: { label: string; dateFrom: string; dateTo: string }[] } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let firstDay: Date;
    let lastDay: Date = new Date(today);
    const chartRanges: { label: string; dateFrom: string; dateTo: string }[] = [];

    switch (this.dateRange) {
      case '30days': {
        firstDay = new Date(today);
        firstDay.setDate(firstDay.getDate() - 29);
        chartRanges.push({ label: 'Last 30 Days', dateFrom: toLocalDateString(firstDay), dateTo: toLocalDateString(lastDay) });
        break;
      }
      case '6months':
        firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          chartRanges.push({ label: start.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' }), dateFrom: toLocalDateString(start), dateTo: toLocalDateString(end) });
        }
        break;
      case 'year':
        firstDay = new Date(now.getFullYear(), 0, 1);
        lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        for (let m = 0; m <= now.getMonth(); m++) {
          const start = new Date(now.getFullYear(), m, 1);
          const end = new Date(now.getFullYear(), m + 1, 0);
          chartRanges.push({ label: start.toLocaleDateString('en-KE', { month: 'short' }), dateFrom: toLocalDateString(start), dateTo: toLocalDateString(end) });
        }
        break;
      case 'all': {
        firstDay = new Date(now.getFullYear() - 10, 0, 1);
        lastDay = new Date(today);
        chartRanges.push({ label: 'All time', dateFrom: toLocalDateString(firstDay), dateTo: toLocalDateString(lastDay) });
        break;
      }
      default:
        firstDay = new Date(now.getFullYear() - 2, 0, 1);
        lastDay = new Date(today);
        for (let y = 0; y < 3; y++) {
          const yr = now.getFullYear() - 2 + y;
          chartRanges.push({ label: String(yr), dateFrom: `${yr}-01-01`, dateTo: yr === now.getFullYear() ? toLocalDateString(lastDay) : `${yr}-12-31` });
        }
    }

    return { firstDay, lastDay, chartRanges };
  }

  private static parseSummary(raw: any): { totalIncome: number; totalExpenses: number; balance: number } {
    const s = raw?.data ?? raw ?? {};
    const income = Number(s.totalIncome ?? s.total_income ?? 0) || 0;
    const expenses = Number(s.totalExpenses ?? s.total_expenses ?? 0) || 0;
    const balance = Number(s.balance ?? 0) || (income - expenses);
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  private getPreviousPeriodRange(): { dateFrom: string; dateTo: string; label: string } | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (this.dateRange) {
      case '30days': {
        const curFirst = new Date(today); curFirst.setDate(curFirst.getDate() - 30);
        const prevLast = new Date(curFirst); prevLast.setDate(prevLast.getDate() - 1);
        const prevFirst = new Date(prevLast); prevFirst.setDate(prevFirst.getDate() - 29);
        return { dateFrom: toLocalDateString(prevFirst), dateTo: toLocalDateString(prevLast), label: 'from previous 30 days' };
      }
      case '6months': {
        const prevEnd = new Date(now.getFullYear(), now.getMonth() - 6, 0);
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        return { dateFrom: toLocalDateString(prevStart), dateTo: toLocalDateString(prevEnd), label: 'from last 6 months' };
      }
      case 'year': {
        const prevYear = now.getFullYear() - 1;
        return { dateFrom: `${prevYear}-01-01`, dateTo: `${prevYear}-12-31`, label: 'from last year' };
      }
      default: return null;
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
    // Show full overlay only on first load; use light indicator for filter changes
    if (this.isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isFilterUpdating = true;
    }
    this.summaryLoadFailed = false;
    this.hasNoDataForPeriod = false;

    const { firstDay, lastDay, chartRanges } = this.getDateRangeForFilter();
    const firstDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(firstDay);
    const lastDayStr = this.dateRange === 'all' ? undefined : toLocalDateString(lastDay);

    const T = 15000;
    const summary$ = this.transactionService.getSummary(firstDayStr, lastDayStr).pipe(timeout(T), catchError((e) => { console.warn('summary failed', e); return of(null); }));
    const categories$ = this.transactionService.getByCategory(firstDayStr, lastDayStr).pipe(timeout(T), catchError(() => of({ data: [] })));
    const alerts$ = this.budgetService.getAlerts().pipe(timeout(T), catchError(() => of({ data: { budgetAlerts: [], nudges: [] } })));
    const goals$ = this.goalService.getGoals().pipe(timeout(T), catchError(() => of({ data: [] })));
    const monthlySummaries$ = chartRanges.length > 1
      ? forkJoin(chartRanges.map((r) => this.transactionService.getSummary(r.dateFrom, r.dateTo).pipe(timeout(T), catchError(() => of(null)))))
      : of([]);
    const prevRange = this.getPreviousPeriodRange();
    const previousSummary$ = prevRange
      ? this.transactionService.getSummary(prevRange.dateFrom, prevRange.dateTo).pipe(timeout(T), catchError(() => of(null)))
      : null;

    forkJoin({
      summary: summary$,
      categories: categories$,
      alerts: alerts$,
      goals: goals$,
      monthly: monthlySummaries$,
      ...(previousSummary$ ? { previousSummary: previousSummary$ } : {}),
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.isFilterUpdating = false;
        this.isInitialLoad = false;
      })
    ).subscribe({
      next: (results) => {
        try {
          this.summaryLoadFailed = results.summary == null;
          const { totalIncome, totalExpenses, balance } = DashboardComponent.parseSummary(results.summary);
          this.totalBalance = balance;
          this.monthlyIncome = totalIncome;
          this.monthlySpending = totalExpenses;
          this.hasNoDataForPeriod = (totalIncome + totalExpenses) === 0;

          if (prevRange && results.previousSummary != null) {
            const prev = results.previousSummary?.data ?? results.previousSummary ?? {};
            this.trendComparisonLabel = prevRange.label;
            this.balanceTrend = this.formatTrendPct(balance, Number(prev.balance ?? 0));
            this.incomeTrend = this.formatTrendPct(totalIncome, Number(prev.totalIncome ?? 0));
            this.spendingTrend = this.formatTrendPct(totalExpenses, Number(prev.totalExpenses ?? 0), true);
          } else {
            this.trendComparisonLabel = 'from previous period';
            this.balanceTrend = this.incomeTrend = this.spendingTrend = { text: '—', isPositive: true };
          }

          const rawCategories = results.categories?.data ?? results.categories;
          const categoryData = Array.isArray(rawCategories) ? rawCategories : [];
          const palette = ['#22c55e','#235347','#10b981','#f59e0b','#ef4444','#8EB69B','#16a34a','#15803d'];
          this.doughnutChartData = categoryData.length > 0 ? {
            labels: categoryData.map((c: any) => c.name ?? 'Other'),
            datasets: [{ data: categoryData.map((c: any) => Number(c.total ?? 0)), backgroundColor: categoryData.map((c: any, i: number) => c.color ?? palette[i % palette.length]), hoverBackgroundColor: categoryData.map((c: any, i: number) => c.color ?? palette[i % palette.length]), borderWidth: 0 }]
          } : { labels: ['No expenses in period'], datasets: [{ data: [1], backgroundColor: ['rgba(142,182,155,0.2)'], hoverBackgroundColor: ['rgba(142,182,155,0.3)'], borderWidth: 0 }] };

          const alertsPayload = results.alerts?.data ?? results.alerts ?? {};
          const rawAlerts = alertsPayload.budgetAlerts ?? [];
          this.nudges = (alertsPayload.nudges ?? []).filter((n: any) => !this.dismissedNudgeIds.has(n.id));
          this.budgetAlerts = rawAlerts.map((b: any) => {
            const limit = Number(b.limitAmount ?? b.limit ?? 0);
            const spent = Number(b.totalSpent ?? b.spent ?? 0);
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe';
            const label = b.category?.name ?? 'Overall';
            const feedback = status === 'danger' ? `Exceeded your ${label} budget.` : status === 'warning' ? `${Math.round(pct)}% of your ${label} budget used.` : `${label}: ${Math.round(pct)}% used.`;
            return { category: label, spent, budget: limit, percentage: Math.min(pct, 100), status, feedback };
          });

          const goalsData = results.goals?.data ?? results.goals ?? [];
          this.goals = goalsData.slice(0, 3).map((g: any) => ({ name: g.name, target: g.targetAmount ?? 0, current: g.currentAmount ?? 0 }));
          this.activeGoalsCount = goalsData.length;
          this.goalsOnTrackCount = goalsData.filter((g: any) => ['on_track','completed','in_progress'].includes(g.status)).length;
          this.goalsNeedAttentionCount = goalsData.filter((g: any) => ['at_risk','overdue'].includes(g.status)).length;

          const chartData = (results.monthly ?? []) as any[];
          const useSummaryForChart = chartRanges.length === 1;
          const incomeByPeriod = useSummaryForChart ? [totalIncome] : chartRanges.map((_, i) => Number((chartData[i]?.data ?? chartData[i] ?? {}).totalIncome ?? 0));
          const expensesByPeriod = useSummaryForChart ? [totalExpenses] : chartRanges.map((_, i) => Number((chartData[i]?.data ?? chartData[i] ?? {}).totalExpenses ?? 0));

          // Update datasets in-place to avoid canvas destruction on filter change
          this.lineChartData = {
            labels: chartRanges.map((r) => r.label),
            datasets: [
              { ...this.lineChartData.datasets[0], data: incomeByPeriod },
              { ...this.lineChartData.datasets[1], data: expensesByPeriod },
            ],
          };
        } catch (e) {
          console.error('Error processing dashboard data', e);
        }
      },
      error: (err) => console.error('Error loading dashboard data', err),
    });
  }

  getGoalProgress(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  get dateRangeLabel(): string {
    return { '30days': 'Last 30 Days', '6months': 'Last 6 Months', 'year': 'This Year', 'all': 'All Time' }[this.dateRange] ?? 'Last 6 Months';
  }
}

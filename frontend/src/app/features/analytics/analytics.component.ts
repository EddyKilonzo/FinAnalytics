import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, timeout, catchError, of, finalize } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { toLocalDateString } from '../../core/utils/date.utils';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideDownload,
  lucideCalendar,
  lucideTarget,
} from '@ng-icons/lucide';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

/**
 * Analytics page — spending target vs actuals only.
 * Overview (dashboard) shows balance, cash flow, category breakdown, and AI insights.
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, BaseChartDirective],
  providers: [
    provideIcons({
      lucideDownload,
      lucideCalendar,
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

  isLoading = true;
  summaryLoadFailed = false;
  hasNoDataForPeriod = false;

  dateRange: '30days' | '6months' | 'year' | 'all' = '6months';

  monthlySpendingTarget: number | null = null;
  spendingTargetInput = '';

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
        backgroundColor: '#22c55e',
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

  private static parseSummary(raw: any): { totalIncome: number; totalExpenses: number; balance: number } {
    const s = raw?.data ?? raw ?? {};
    const income = Number(s.totalIncome ?? s.total_income ?? 0) || 0;
    const expenses = Number(s.totalExpenses ?? s.total_expenses ?? 0) || 0;
    const balance = Number(s.balance ?? 0) || (income - expenses);
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  ngOnInit(): void {
    this.loadData();
    const isLightMode = document.documentElement.classList.contains('light');
    const textColor = isLightMode ? '#051F20' : '#DAF1DE';
    const gridColor = isLightMode ? 'rgba(5, 31, 32, 0.08)' : 'rgba(218, 241, 222, 0.1)';
    const tooltipBg = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 43, 38, 0.95)';
    const tooltipTitle = isLightMode ? '#051F20' : '#DAF1DE';
    const tooltipBody = isLightMode ? '#235347' : '#8EB69B';
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
        chartRanges.push({
          label: 'Last 30 Days',
          dateFrom: toLocalDateString(firstDay),
          dateTo: toLocalDateString(lastDay),
        });
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

    const useSummaryForChart = chartRanges.length === 1;
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
      monthly: periodSummaries$,
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (result) => {
          this.summaryLoadFailed = result.summary == null;
          const { totalIncome: income, totalExpenses: expenses } = AnalyticsComponent.parseSummary(result.summary);
          this.hasNoDataForPeriod = (income + expenses) === 0;

          const periodData = (result.monthly ?? []) as any[];
          const useSummary = chartRanges.length === 1;
          const actuals = useSummary
            ? [expenses]
            : chartRanges.map((_, idx) => {
                const m = periodData[idx];
                const data = m?.data ?? m ?? {};
                return Number(data.totalExpenses ?? 0);
              });

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
                backgroundColor: '#22c55e',
                borderRadius: 4,
                barPercentage: 0.6,
              },
            ],
          };
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
      const n = num;
      this.barChartData = {
        ...this.barChartData,
        datasets: [
          {
            ...this.barChartData.datasets[0],
            data: this.barChartData.labels!.map(() => n),
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

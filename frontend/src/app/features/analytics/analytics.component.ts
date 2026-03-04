import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../core/services/transaction.service';
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
} from '@ng-icons/lucide';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgIconComponent, BaseChartDirective],
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
    }),
    provideCharts(withDefaultRegisterables()),
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
})
export class AnalyticsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  isLoading = true;

  // Mock Data for KPI cards
  metrics = [
    { label: 'Total Revenue', value: 'KSh 124,563', trend: '+14.5%', isPositive: true },
    { label: 'Average Transaction', value: 'KSh 84', trend: '+2.1%', isPositive: true },
    { label: 'Active Subscriptions', value: '1,204', trend: '-1.4%', isPositive: false },
    { label: 'Expense Rate', value: '32.1%', trend: '-4.3%', isPositive: true }, // lower is better
  ];

  // Insights
  insights = [
    {
      title: 'Spending Spike',
      description: 'Marketing expenses increased by 24% last week.',
      type: 'warning',
      icon: 'lucideZap',
    },
    {
      title: 'Goal Reached',
      description: 'Q3 Revenue target hit 5 days early.',
      type: 'success',
      icon: 'lucideTrendingUp',
    },
    {
      title: 'Optimization',
      description: 'Switching cloud providers saved KSh 400 this month.',
      type: 'info',
      icon: 'lucideActivity',
    },
  ];

  // Summary Line Chart (Revenue vs Expenses)
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [12000, 19000, 15000, 22000, 18000, 28000, 24000],
        label: 'Revenue',
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // Emerald 500 with opacity
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
        data: [8000, 11000, 9500, 14000, 12000, 16000, 13000],
        label: 'Expenses',
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red 500 with opacity
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
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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

  // Doughnut Chart (By Category Breakdown)
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Software', 'Marketing', 'Payroll', 'Operations', 'Legal'],
    datasets: [
      {
        data: [25, 30, 20, 15, 10],
        backgroundColor: [
          '#6366f1', // Indigo
          '#8b5cf6', // Violet
          '#ec4899', // Pink
          '#14b8a6', // Teal
          '#f59e0b', // Amber
        ],
        hoverBackgroundColor: ['#4f46e5', '#7c3aed', '#db2777', '#0d9488', '#d97706'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
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
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed + '%';
            }
            return label;
          },
        },
      },
    },
  };

  public doughnutChartType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';

  // Bar Chart (Monthly Comparison)
  public barChartData: ChartConfiguration['data'] = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55],
        label: 'Target',
        backgroundColor: '#e2e8f0', // Slate 200
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        data: [45, 65, 75, 85, 60, 70],
        label: 'Actual',
        backgroundColor: '#3b82f6', // Blue 500
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
    // Update chart colors based on theme if needed, or rely on Chart.js defaults
    const isLightMode = document.documentElement.classList.contains('light');

    // Example of dynamic color adjustment based on theme
    const textColor = isLightMode ? '#051F20' : '#DAF1DE';
    const gridColor = isLightMode ? 'rgba(5, 31, 32, 0.08)' : 'rgba(218, 241, 222, 0.1)';
    const tooltipBg = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 43, 38, 0.95)';
    const tooltipTitle = isLightMode ? '#051F20' : '#DAF1DE';
    const tooltipBody = isLightMode ? '#235347' : '#8EB69B';

// Apply to line chart
    if (this.lineChartOptions) {
      if (this.lineChartOptions.scales) {
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
      if (this.lineChartOptions.plugins) {
        if (this.lineChartOptions.plugins.legend && this.lineChartOptions.plugins.legend.labels) {
          this.lineChartOptions.plugins.legend.labels.color = textColor;
        }
        if (this.lineChartOptions.plugins.tooltip) {
          this.lineChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
          this.lineChartOptions.plugins.tooltip.titleColor = tooltipTitle;
          this.lineChartOptions.plugins.tooltip.bodyColor = tooltipBody;
        }
      }
    }

    // Apply to bar chart
    if (this.barChartOptions) {
      if (this.barChartOptions.scales) {
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
      if (this.barChartOptions.plugins) {
        if (this.barChartOptions.plugins.legend && this.barChartOptions.plugins.legend.labels) {
          this.barChartOptions.plugins.legend.labels.color = textColor;
        }
        if (this.barChartOptions.plugins.tooltip) {
          this.barChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
          this.barChartOptions.plugins.tooltip.titleColor = tooltipTitle;
          this.barChartOptions.plugins.tooltip.bodyColor = tooltipBody;
        }
      }
    }

    // Apply to doughnut chart
    if (this.doughnutChartOptions && this.doughnutChartOptions.plugins) {
      if (
        this.doughnutChartOptions.plugins.legend &&
        this.doughnutChartOptions.plugins.legend.labels
      ) {
        this.doughnutChartOptions.plugins.legend.labels.color = textColor;
      }
      if (this.doughnutChartOptions.plugins.tooltip) {
        this.doughnutChartOptions.plugins.tooltip.backgroundColor = tooltipBg;
        this.doughnutChartOptions.plugins.tooltip.titleColor = tooltipTitle;
        this.doughnutChartOptions.plugins.tooltip.bodyColor = tooltipBody;
      }
    }
  }

  loadData(): void {
    this.isLoading = true;

    const formatKES = (val: number) =>
      new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);

    this.transactionService.getSummary().subscribe({
      next: (res) => {
        const s = res?.data ?? res ?? {};
        const income = s.totalIncome || 0;
        const expenses = s.totalExpenses || 0;
        const balance = s.balance || 0;
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
      },
    });

    this.transactionService.getByCategory().subscribe({
      next: (res) => {
        const categories: any[] = res?.data ?? res ?? [];
        if (categories.length > 0) {
          const palette = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#3b82f6','#10b981','#ef4444'];
          this.doughnutChartData = {
            labels: categories.map((c: any) => c.name),
            datasets: [{
              data: categories.map((c: any) => c.total),
              backgroundColor: categories.map((c: any, i: number) => c.color || palette[i % palette.length]),
              hoverBackgroundColor: categories.map((c: any, i: number) => c.color || palette[i % palette.length]),
              borderWidth: 0,
              hoverOffset: 4,
            }],
          };
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconComponent, BaseChartDirective],
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

  // Summary Cards Data
  totalBalance = 0;
  monthlyIncome = 0;
  monthlySpending = 0;
  activeGoalsCount = 0;
  isLoading = true;

  // Budget Alerts
  budgetAlerts: any[] = [];

  // Goals Summary
  goals: any[] = [];

  // Insights
  insights = [
    { text: 'Keep up the good work saving towards your goals!', type: 'positive' },
    { text: 'Consider reviewing your recurring subscriptions.', type: 'suggestion' }
  ];

  // Chart Configuration
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55, 40],
        label: 'Income',
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald 500
        borderColor: 'rgba(16, 185, 129, 1)',
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
        fill: 'origin',
        tension: 0.4
      },
      {
        data: [28, 48, 40, 19, 86, 27, 90],
        label: 'Expenses',
        backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red 500
        borderColor: 'rgba(239, 68, 68, 1)',
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(239, 68, 68, 1)',
        fill: 'origin',
        tension: 0.4
      }
    ],
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July']
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
        usePointStyle: true
      }
    }
  };

  public doughnutChartType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    
    // Get current month date range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    forkJoin({
      summary: this.transactionService.getSummary(firstDay, lastDay),
      categories: this.transactionService.getByCategory(firstDay, lastDay),
      budgets: this.budgetService.getBudgets(),
      goals: this.goalService.getGoals()
    }).subscribe({
      next: (results) => {
        // Summary
        const summaryData = results.summary.data || results.summary;
        this.totalBalance = summaryData.balance || 0;
        this.monthlyIncome = summaryData.totalIncome || 0;
        this.monthlySpending = summaryData.totalExpenses || 0;

        // Categories for Doughnut chart
        const categoryData = results.categories.data || results.categories || [];
        if (categoryData && categoryData.length > 0) {
          this.doughnutChartData.labels = categoryData.map((c: any) => c.name);
          this.doughnutChartData.datasets[0].data = categoryData.map((c: any) => c.total);
        } else {
          this.doughnutChartData.labels = ['No Data'];
          this.doughnutChartData.datasets[0].data = [1];
        }

        // Refresh chart
        this.doughnutChartData = { ...this.doughnutChartData };

        // Budgets
        const budgetsData = results.budgets.data || results.budgets || [];
        this.budgetAlerts = budgetsData.map((b: any) => {
          const limit = b.limitAmount || b.limit || 0;
          const spent = b.totalSpent || b.spent || 0;
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;
          
          let status = 'safe';
          if (percentage > 100) status = 'danger';
          else if (percentage > 80) status = 'warning';
          
          return {
            category: b.category?.name || 'General',
            spent: spent,
            budget: limit,
            percentage: percentage,
            status: status
          };
        }).filter((b: any) => b.status === 'danger' || b.status === 'warning').slice(0, 5);

        // Goals
        const goalsData = results.goals.data || results.goals || [];
        this.goals = goalsData.slice(0, 3).map((g: any) => ({
          name: g.name,
          target: g.targetAmount || g.target || 0,
          current: g.currentAmount || g.current || 0
        }));
        this.activeGoalsCount = goalsData.length;
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  getGoalProgress(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }
}

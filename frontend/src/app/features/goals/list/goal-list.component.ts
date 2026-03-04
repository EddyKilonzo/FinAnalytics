import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTarget, lucideTrendingUp, lucideCalendar } from '@ng-icons/lucide';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './goal-list.component.html',
  styleUrls: ['./goal-list.component.css'],
  viewProviders: [provideIcons({ lucidePlus, lucideTarget, lucideTrendingUp, lucideCalendar })],
})
export class GoalListComponent implements OnInit {
  goals: Goal[] = [];
  loading = true;

  private goalService = inject(GoalService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.goalService.getGoals().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.goals = response.data.map((g: any) => ({
            id: g.id,
            name: g.name,
            target: g.targetAmount,
            current: g.currentAmount,
            deadline: g.deadline
          }));
        } else if (Array.isArray(response)) {
          this.goals = response.map((g: any) => ({
            id: g.id,
            name: g.name,
            target: g.targetAmount,
            current: g.currentAmount,
            deadline: g.deadline
          }));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(getBackendErrorMessage(err, 'Failed to load goals.'));
      }
    });
  }

  getPercentage(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }
}

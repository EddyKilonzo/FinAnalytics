import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePiggyBank, lucideWallet, lucideCalendar, lucideTarget, lucideTrash2 } from '@ng-icons/lucide';
import { GoalService } from '../../../core/services/goal.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgIconComponent],
  templateUrl: './goal-detail.component.html',
  styleUrls: ['./goal-detail.component.css'],
  viewProviders: [provideIcons({ lucideArrowLeft, lucidePiggyBank, lucideWallet, lucideCalendar, lucideTarget, lucideTrash2 })]
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalService = inject(GoalService);
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);

  goal: Goal | null = null;
  /** Total Balance (account): income - expenses. Allocations cannot exceed this. */
  availableBalance = 0;
  allocationAmount: number | null = null;
  withdrawAmount: number | null = null;
  activeTab: 'allocate' | 'withdraw' = 'allocate';
  loading = true;
  actionLoading = false;
  deleting = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.goalService.getGoal(id).subscribe({
      next: (res) => {
        const g = res?.data ?? res;
        this.goal = {
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount ?? 0,
          currentAmount: g.currentAmount ?? 0,
          targetDate: g.deadline ?? g.targetDate ?? ''
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(getBackendErrorMessage(err, 'Failed to load goal.'));
      }
    });
    this.transactionService.getSummary().subscribe({
      next: (res) => {
        const s = res?.data ?? res;
        this.availableBalance = Number(s?.balance ?? 0);
      },
      error: () => { this.availableBalance = 0; }
    });
  }

  getPercentage(): number {
    if (!this.goal) return 0;
    return Math.min(Math.round((this.goal.currentAmount / this.goal.targetAmount) * 100), 100);
  }

  allocateFunds() {
    if (!this.goal?.id || !this.allocationAmount || this.allocationAmount <= 0 || this.actionLoading) return;
    const amount = Number(this.allocationAmount);
    if (amount > this.availableBalance) {
      this.toast.error(`Cannot allocate KES ${amount.toFixed(0)} — your Total Balance is only KES ${this.availableBalance.toFixed(0)}.`);
      return;
    }
    this.actionLoading = true;
    this.goalService.allocateFunds(this.goal.id, amount).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        if (data) {
          this.goal = { ...this.goal!, currentAmount: data.currentAmount ?? this.goal!.currentAmount + amount };
        }
        this.allocationAmount = null;
        this.actionLoading = false;
        this.transactionService.getSummary().subscribe({
          next: (res) => {
            const s = res?.data ?? res;
            this.availableBalance = Number(s?.balance ?? 0);
          },
          error: () => { this.availableBalance = Math.max(0, this.availableBalance - amount); }
        });
        this.toast.success(`KES ${amount} saved to goal. Deducted from your Total Balance.`);
      },
      error: (err) => {
        this.actionLoading = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not allocate funds.'));
      }
    });
  }

  withdrawFunds() {
    if (!this.goal?.id || !this.withdrawAmount || this.withdrawAmount <= 0 || this.actionLoading) return;
    if (this.withdrawAmount > this.goal.currentAmount) {
      this.toast.error('Cannot withdraw more than current amount.');
      return;
    }
    this.actionLoading = true;
    this.goalService.withdrawFunds(this.goal.id, this.withdrawAmount).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        if (data) {
          this.goal = { ...this.goal!, currentAmount: data.currentAmount ?? this.goal!.currentAmount - this.withdrawAmount! };
        }
        this.withdrawAmount = null;
        this.actionLoading = false;
        this.toast.success('Withdrawal successful.');
      },
      error: (err) => {
        this.actionLoading = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not withdraw funds.'));
      }
    });
  }

  confirmDelete() {
    if (!this.goal?.id || this.deleting) return;
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    this.deleting = true;
    this.goalService.deleteGoal(this.goal.id).subscribe({
      next: () => {
        this.toast.success('Goal deleted successfully.');
        this.router.navigate(['/goals']);
      },
      error: (err) => {
        this.deleting = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not delete goal.'));
      }
    });
  }
}

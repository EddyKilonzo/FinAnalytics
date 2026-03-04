import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideGraduationCap,
  lucideBriefcase,
  lucideUser,
  lucideUsers,
  lucideCheck,
  lucideArrowRight,
  lucideArrowLeft,
  lucideTrendingUp,
  lucideWallet,
  lucideBuilding,
  lucideLaptop,
  lucideShoppingBag,
  lucideGift,
  lucidePiggyBank,
  lucideMoreHorizontal,
  lucideLoader,
} from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../core/utils/backend-error';

export type UserType =
  | 'FORM_FOUR_STUDENT'
  | 'UNIVERSITY_STUDENT'
  | 'RECENT_GRADUATE'
  | 'YOUNG_PROFESSIONAL';

interface UserTypeOption {
  value: UserType;
  label: string;
  description: string;
  icon: string;
}

interface IncomeSourceOption {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideGraduationCap,
      lucideBriefcase,
      lucideUser,
      lucideUsers,
      lucideCheck,
      lucideArrowRight,
      lucideArrowLeft,
      lucideTrendingUp,
      lucideWallet,
      lucideBuilding,
      lucideLaptop,
      lucideShoppingBag,
      lucideGift,
      lucidePiggyBank,
      lucideMoreHorizontal,
      lucideLoader,
    }),
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  step = signal<1 | 2>(1);
  loading = signal(false);

  selectedUserType = signal<UserType | null>(null);
  selectedIncomeSources = signal<string[]>([]);

  readonly userTypeOptions: UserTypeOption[] = [
    {
      value: 'FORM_FOUR_STUDENT',
      label: 'Form Four Student',
      description: 'Secondary school, learning to manage pocket money & allowances',
      icon: 'lucideGraduationCap',
    },
    {
      value: 'UNIVERSITY_STUDENT',
      label: 'University Student',
      description: 'Higher education, balancing tuition, living costs & side income',
      icon: 'lucideUsers',
    },
    {
      value: 'RECENT_GRADUATE',
      label: 'Recent Graduate',
      description: 'Just entered the workforce, building financial foundations',
      icon: 'lucideUser',
    },
    {
      value: 'YOUNG_PROFESSIONAL',
      label: 'Young Professional',
      description: 'Established career, growing wealth & planning for the future',
      icon: 'lucideBriefcase',
    },
  ];

  readonly incomeSourceOptions: IncomeSourceOption[] = [
    { value: 'allowance', label: 'Allowance', icon: 'lucideGift' },
    { value: 'part_time_job', label: 'Part-time Job', icon: 'lucideShoppingBag' },
    { value: 'freelance', label: 'Freelance', icon: 'lucideLaptop' },
    { value: 'salary', label: 'Salary', icon: 'lucideBuilding' },
    { value: 'business', label: 'Business', icon: 'lucideBriefcase' },
    { value: 'investments', label: 'Investments', icon: 'lucideTrendingUp' },
    { value: 'savings', label: 'Savings', icon: 'lucidePiggyBank' },
    { value: 'rental', label: 'Rental Income', icon: 'lucideWallet' },
    { value: 'other', label: 'Other', icon: 'lucideMoreHorizontal' },
  ];

  selectUserType(type: UserType): void {
    this.selectedUserType.set(type);
  }

  toggleIncomeSource(value: string): void {
    const current = this.selectedIncomeSources();
    if (current.includes(value)) {
      this.selectedIncomeSources.set(current.filter((v) => v !== value));
    } else {
      this.selectedIncomeSources.set([...current, value]);
    }
  }

  isIncomeSelected(value: string): boolean {
    return this.selectedIncomeSources().includes(value);
  }

  goToStep2(): void {
    if (!this.selectedUserType()) return;
    this.step.set(2);
  }

  goBack(): void {
    this.step.set(1);
  }

  get canSubmit(): boolean {
    return (
      !!this.selectedUserType() &&
      this.selectedIncomeSources().length > 0 &&
      !this.loading()
    );
  }

  submit(): void {
    if (!this.canSubmit) return;

    this.loading.set(true);

    this.auth
      .completeOnboarding({
        userType: this.selectedUserType()!,
        incomeSources: this.selectedIncomeSources(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.toast.success('Welcome to FinAnalytix! Your profile is ready.');
          this.router.navigate(['/dashboard']);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.toast.error(getBackendErrorMessage(err, 'Could not complete setup. Please try again.'));
        },
      });
  }

  get progressPercent(): number {
    return this.step() === 1 ? 50 : 100;
  }
}

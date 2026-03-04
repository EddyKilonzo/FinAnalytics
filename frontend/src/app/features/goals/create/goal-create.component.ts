import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck } from '@ng-icons/lucide';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';

@Component({
  selector: 'app-goal-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgIconComponent],
  templateUrl: './goal-create.component.html',
  styleUrls: ['./goal-create.component.css'],
  viewProviders: [provideIcons({ lucideArrowLeft, lucideCheck })]
})
export class GoalCreateComponent {
  private goalService = inject(GoalService);
  private toast = inject(ToastService);
  private router = inject(Router);

  goalForm: FormGroup;
  saving = false;

  constructor(private fb: FormBuilder) {
    this.goalForm = this.fb.group({
      name: ['', Validators.required],
      targetAmount: [null, [Validators.required, Validators.min(1)]],
      targetDate: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.goalForm.invalid || this.saving) return;
    const v = this.goalForm.value;
    const deadline = v.targetDate ? new Date(v.targetDate).toISOString() : undefined;
    const payload = {
      name: v.name,
      targetAmount: Number(v.targetAmount),
      ...(deadline ? { deadline } : {})
    };
    this.saving = true;
    this.goalService.createGoal(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Goal created successfully.');
        this.router.navigate(['/goals']);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(getBackendErrorMessage(err, 'Could not create goal. Please try again.'));
      }
    });
  }
}

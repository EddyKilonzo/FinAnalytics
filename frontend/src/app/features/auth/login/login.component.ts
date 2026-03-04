import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';
import { ToastService } from '../../../shared/toast/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideGithub, lucideMonitor } from '@ng-icons/lucide';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ lucideEye, lucideEyeOff, lucideGithub, lucideMonitor })],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  showPassword = false;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  loading = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        try {
          this.loading = false;
          this.toast.success('Signed in successfully.');
          this.router.navigate(['/dashboard']);
        } catch (e) {
          this.loading = false;
          this.toast.error('Something went wrong.');
        }
      },
      error: (err: HttpErrorResponse) => {
        try {
          this.loading = false;
          const msg = getBackendErrorMessage(err, 'Login failed');
          this.toast.error(msg);
        } catch (e) {
          this.loading = false;
          this.toast.error('Login failed');
        }
      }
    });
  }
}

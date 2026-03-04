import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { getBackendErrorMessage } from '../../../core/utils/backend-error';
import { ToastService } from '../../../shared/toast/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideGithub, lucideMonitor, lucideMail, lucideRefreshCw } from '@ng-icons/lucide';

type Step = 'register' | 'verify';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ lucideEye, lucideEyeOff, lucideGithub, lucideMonitor, lucideMail, lucideRefreshCw })],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  step: Step = 'register';
  pendingEmail = '';

  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  resendLoading = false;
  resendCooldown = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  // Field-level backend error messages mapped to specific inputs
  backendFieldErrors: Record<'name' | 'email' | 'password' | 'confirmPassword', string | null> = {
    name: null,
    email: null,
    password: null,
    confirmPassword: null,
  };

  // Generic form-level error (shown above the form if needed)
  formError = '';

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  verifyForm: FormGroup = this.fb.group({
    d0: ['', [Validators.required, Validators.pattern(/^\d$/)]],
    d1: ['', [Validators.required, Validators.pattern(/^\d$/)]],
    d2: ['', [Validators.required, Validators.pattern(/^\d$/)]],
    d3: ['', [Validators.required, Validators.pattern(/^\d$/)]],
    d4: ['', [Validators.required, Validators.pattern(/^\d$/)]],
    d5: ['', [Validators.required, Validators.pattern(/^\d$/)]],
  });

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordValue(): string {
    return this.registerForm.get('password')?.value ?? '';
  }

  get hasUppercase(): boolean  { return /[A-Z]/.test(this.passwordValue); }
  get hasNumber(): boolean     { return /[0-9]/.test(this.passwordValue); }
  get hasSpecial(): boolean    { return /[^A-Za-z0-9]/.test(this.passwordValue); }

  get passwordStrength(): { score: number; label: string; level: 'weak' | 'fair' | 'strong' | 'very-strong' } {
    const pw: string = this.passwordValue;
    if (!pw) return { score: 0, label: '', level: 'weak' };

    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score: 1, label: 'Weak',        level: 'weak' };
    if (score === 2) return { score: 2, label: 'Fair',        level: 'fair' };
    if (score === 3) return { score: 3, label: 'Good',        level: 'strong' };
    return               { score: 4, label: 'Strong',       level: 'very-strong' };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.clearBackendErrors();
    this.formError = '';

    const { name, email, password, confirmPassword } = this.registerForm.value;
    if (password !== confirmPassword) {
      const confirmControl = this.registerForm.get('confirmPassword');
      const existingErrors = confirmControl?.errors ?? {};
      confirmControl?.setErrors({ ...existingErrors, mismatch: true });
      confirmControl?.markAsTouched();
      return;
    }

    this.loading = true;
    this.authService.register({ email, password, name }).subscribe({
      next: () => {
        this.loading = false;
        this.pendingEmail = email;
        this.step = 'verify';
        this.toast.success('Verification code sent to your email.');
        this.startCooldown();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.formError = getBackendErrorMessage(err, 'Registration failed');
        this.applyBackendFieldErrors(err);
        this.toast.error(this.formError);
      }
    });
  }

  onDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    input.value = val;
    const key = `d${index}` as keyof typeof this.verifyForm.controls;
    this.verifyForm.controls[key].setValue(val);

    if (val && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  }

  onDigitKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      const key = `d${index}` as keyof typeof this.verifyForm.controls;
      if (!this.verifyForm.controls[key].value && index > 0) {
        const prev = document.getElementById(`otp-${index - 1}`);
        prev?.focus();
      }
    }
  }

  onDigitPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((d, i) => {
      const key = `d${i}` as keyof typeof this.verifyForm.controls;
      this.verifyForm.controls[key].setValue(d);
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement | null;
      if (input) input.value = d;
    });
    const lastIdx = Math.min(digits.length, 5);
    document.getElementById(`otp-${lastIdx}`)?.focus();
  }

  get otpCode(): string {
    return ['d0','d1','d2','d3','d4','d5'].map(k => this.verifyForm.value[k] ?? '').join('');
  }

  onVerify() {
    if (this.verifyForm.invalid) return;

    this.loading = true;
    this.authService.verifyEmailCode(this.pendingEmail, this.otpCode).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Email verified! Welcome aboard.');
        this.router.navigate(['/onboarding']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.toast.error(getBackendErrorMessage(err, 'Verification failed. Please try again.'));
      }
    });
  }

  resendCode() {
    if (this.resendCooldown > 0 || this.resendLoading) return;
    this.resendLoading = true;
    this.authService.resendVerification(this.pendingEmail).subscribe({
      next: () => {
        this.resendLoading = false;
        this.toast.success('A new code has been sent to your email.');
        this.startCooldown();
      },
      error: () => {
        this.resendLoading = false;
        this.toast.error('Could not resend the code. Please try again.');
      }
    });
  }

  private clearBackendErrors() {
    (Object.keys(this.backendFieldErrors) as (keyof typeof this.backendFieldErrors)[]).forEach((key) => {
      this.backendFieldErrors[key] = null;
    });

    Object.values(this.registerForm.controls).forEach((control) => {
      const currentErrors = control.errors ?? {};
      if ('backend' in currentErrors) {
        const { backend, ...rest } = currentErrors as Record<string, unknown>;
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  private setBackendErrorOnControl(
    key: keyof typeof this.backendFieldErrors,
    message: string,
  ) {
    this.backendFieldErrors[key] = message;
    const control = this.registerForm.get(key);
    if (control) {
      const currentErrors = control.errors ?? {};
      control.setErrors({ ...currentErrors, backend: true });
      control.markAsTouched();
    }
  }

  private applyBackendFieldErrors(err: HttpErrorResponse) {
    const body = err?.error as any;
    if (!body || typeof body !== 'object') return;

    const messages: string[] = Array.isArray(body.errors) ? body.errors : [];
    if (!messages.length) return;

    messages.forEach((rawMsg) => {
      const msg = String(rawMsg);
      const lower = msg.toLowerCase();

      if (lower.includes('email')) {
        this.setBackendErrorOnControl('email', msg);
      } else if (lower.includes('password')) {
        this.setBackendErrorOnControl('password', msg);
      } else if (lower.includes('name')) {
        this.setBackendErrorOnControl('name', msg);
      }
    });
  }

  private startCooldown(seconds = 60) {
    this.resendCooldown = seconds;
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.resendCooldown = 0;
        clearInterval(this.cooldownInterval!);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }
}

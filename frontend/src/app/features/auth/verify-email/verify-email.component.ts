import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideXCircle } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideCheckCircle, lucideXCircle })],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div class="w-full max-w-md text-center">
        @if (state === 'loading') {
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
            <h2 class="text-xl font-semibold text-slate-700">Verifying your email…</h2>
            <p class="text-slate-500">Please wait a moment.</p>
          </div>
        }

        @if (state === 'success') {
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <ng-icon name="lucideCheckCircle" size="36" class="text-emerald-500"></ng-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Email Verified!</h2>
            <p class="text-slate-500">Your account is ready. Redirecting you now…</p>
          </div>
        }

        @if (state === 'error') {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <ng-icon name="lucideXCircle" size="36" class="text-red-500"></ng-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Verification Failed</h2>
            <p class="text-slate-500 text-sm">{{ errorMessage }}</p>
            <div class="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                (click)="retry()"
                [disabled]="resending"
                class="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {{ resending ? 'Sending…' : 'Resend verification email' }}
              </button>
              <a href="/auth/login" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-center">
                Back to login
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  state: 'loading' | 'success' | 'error' = 'loading';
  errorMessage = 'The verification link is invalid or has expired.';
  resending = false;
  private email = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const token = params.get('token');
    this.email = params.get('email') ?? '';

    if (!token || !this.email) {
      this.state = 'error';
      this.errorMessage = 'Missing verification parameters. Please use the link sent to your email.';
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/auth/verify-email`, {
      params: { email: this.email, token }
    }).subscribe({
      next: (res) => {
        if (res?.data?.accessToken) {
          localStorage.setItem('accessToken', res.data.accessToken);
          if (res.data.user) {
            localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            this.authService.patchCurrentUser(res.data.user);
          }
        }
        this.state = 'success';
        setTimeout(() => {
          const user = res?.data?.user;
          if (user?.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/onboarding']);
          }
        }, 1500);
      },
      error: (err) => {
        this.state = 'error';
        const body = err?.error;
        this.errorMessage = body?.message ?? 'The verification link is invalid or has expired.';
      }
    });
  }

  retry(): void {
    if (!this.email || this.resending) return;
    this.resending = true;
    this.http.post<any>(`${environment.apiUrl}/auth/resend-verification`, { email: this.email }).subscribe({
      next: () => {
        this.resending = false;
        this.errorMessage = 'A new verification email has been sent. Please check your inbox.';
      },
      error: () => {
        this.resending = false;
        this.errorMessage = 'Could not resend the email. Please try again or contact support.';
      }
    });
  }
}

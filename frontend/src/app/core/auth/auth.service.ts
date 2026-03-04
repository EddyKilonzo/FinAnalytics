import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  onboardingCompleted?: boolean;
  userType?: string;
  incomeSources?: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: User;
  };
}

export interface SignUpResponse {
  success: boolean;
  message: string;
  data: {
    requiresEmailVerification: boolean;
    email: string;
  };
}

export interface OnboardingPayload {
  userType: string;
  incomeSources: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    try {
      this.loadToken();
    } catch (err) {
      console.warn('AuthService: loadToken failed', err);
      this.logout();
    }
  }

  private loadToken(): void {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Restore user instantly from cache so the UI shows name/avatar immediately
      const cached = localStorage.getItem('currentUser');
      if (cached) {
        try {
          this.currentUserSubject.next(JSON.parse(cached));
        } catch {
          localStorage.removeItem('currentUser');
        }
      }

      // Then re-validate with the server in the background (deferred to avoid interceptor circular dep)
      setTimeout(() => {
        this.fetchProfile().subscribe({
          next: () => {},
          error: (err: HttpErrorResponse) => {
            if (err.status === 401) {
              this.logout();
            }
          }
        });
      }, 0);
    } catch (err) {
      console.warn('AuthService: loadToken read failed', err);
      this.logout();
    }
  }

  register(data: { email: string; password: string; name: string }): Observable<SignUpResponse> {
    return this.http.post<SignUpResponse>(`${this.apiUrl}/signup`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  verifyEmailCode(email: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email-code`, { email, code }).pipe(
      tap(response => this.handleAuthResponse(response)),
      catchError(err => throwError(() => err))
    );
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, { email }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthResponse(response)),
      catchError(err => throwError(() => err))
    );
  }

  completeOnboarding(payload: OnboardingPayload): Observable<any> {
    return this.http.patch(`${this.apiUrl}/onboarding`, payload).pipe(
      tap((res: any) => {
        try {
          if (res?.data) {
            this.currentUserSubject.next(res.data.user ?? res.data);
          }
        } catch (err) {
          console.warn('AuthService: completeOnboarding tap failed', err);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
    } catch (err) {
      console.warn('AuthService: logout cleanup failed', err);
      this.currentUserSubject.next(null);
    }
  }

  private handleAuthResponse(response: AuthResponse): void {
    try {
      if (response?.success && response?.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        const user = response.data.user ?? null;
        if (user) localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }
    } catch (err) {
      console.warn('AuthService: handleAuthResponse failed', err);
    }
  }

  fetchProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((res: any) => {
        try {
          if (res?.success && res?.data) {
            localStorage.setItem('currentUser', JSON.stringify(res.data));
            this.currentUserSubject.next(res.data);
          }
        } catch (err) {
          console.warn('AuthService: fetchProfile tap failed', err);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  getToken(): string | null {
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  patchCurrentUser(patch: Partial<User>): void {
    const current = this.currentUserSubject.getValue();
    if (current) {
      const updated = { ...current, ...patch };
      localStorage.setItem('currentUser', JSON.stringify(updated));
      this.currentUserSubject.next(updated);
    }
  }

  hasCompletedOnboarding(): boolean {
    return !!this.getCurrentUser()?.onboardingCompleted;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, PaginatedResponse, AdminDashboardStats, MonthlyStatItem, Transaction, Budget, Goal } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  getDashboard(): Observable<ApiResponse<AdminDashboardStats>> {
    return this.http.get<ApiResponse<AdminDashboardStats>>(`${this.apiUrl}/dashboard`);
  }

  getMonthlyStats(): Observable<ApiResponse<MonthlyStatItem[]>> {
    return this.http.get<ApiResponse<MonthlyStatItem[]>>(`${this.apiUrl}/stats/monthly`);
  }

  getTransactions(page?: number, limit?: number): Observable<PaginatedResponse<Transaction>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<PaginatedResponse<Transaction>>(`${this.apiUrl}/transactions`, { params });
  }

  getBudgets(page?: number, limit?: number): Observable<PaginatedResponse<Budget>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<PaginatedResponse<Budget>>(`${this.apiUrl}/budgets`, { params });
  }

  getGoals(page?: number, limit?: number): Observable<PaginatedResponse<Goal>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<PaginatedResponse<Goal>>(`${this.apiUrl}/goals`, { params });
  }

  retrainModel(): Observable<ApiResponse<{ samplesUsed?: number }>> {
    return this.http.post<ApiResponse<{ samplesUsed?: number }>>(`${this.apiUrl}/ml/retrain`, {});
  }

  getUsers(page?: number, limit?: number, search?: string): Observable<PaginatedResponse<any>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<any>>(`${environment.apiUrl}/users`, { params });
  }

  updateUser(id: string, body: { name?: string; role?: string }): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${environment.apiUrl}/users/${id}`, body);
  }

  suspendUser(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/users/${id}/suspend`, {});
  }

  unsuspendUser(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/users/${id}/unsuspend`, {});
  }

  deleteUser(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/users/${id}`);
  }
}

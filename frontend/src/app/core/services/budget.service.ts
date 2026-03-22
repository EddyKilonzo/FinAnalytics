import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Budget, BudgetAlertsResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/budgets`;

  getBudgets(): Observable<ApiResponse<Budget[]>> {
    return this.http.get<ApiResponse<Budget[]>>(this.apiUrl);
  }

  getAlerts(): Observable<ApiResponse<BudgetAlertsResponse>> {
    return this.http.get<ApiResponse<BudgetAlertsResponse>>(`${this.apiUrl}/alerts`);
  }

  getBudget(id: string): Observable<ApiResponse<Budget>> {
    return this.http.get<ApiResponse<Budget>>(`${this.apiUrl}/${id}`);
  }

  createBudget(data: Partial<Budget>): Observable<ApiResponse<Budget>> {
    return this.http.post<ApiResponse<Budget>>(this.apiUrl, data);
  }

  updateBudget(id: string, data: Partial<Budget>): Observable<ApiResponse<Budget>> {
    return this.http.patch<ApiResponse<Budget>>(`${this.apiUrl}/${id}`, data);
  }

  deleteBudget(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}

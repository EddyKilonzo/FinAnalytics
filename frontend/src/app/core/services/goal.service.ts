import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Goal } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/goals`;

  getGoals(): Observable<ApiResponse<Goal[]>> {
    return this.http.get<ApiResponse<Goal[]>>(this.apiUrl);
  }

  getGoal(id: string): Observable<ApiResponse<Goal>> {
    return this.http.get<ApiResponse<Goal>>(`${this.apiUrl}/${id}`);
  }

  createGoal(data: Partial<Goal>): Observable<ApiResponse<Goal>> {
    return this.http.post<ApiResponse<Goal>>(this.apiUrl, data);
  }

  updateGoal(id: string, data: Partial<Goal>): Observable<ApiResponse<Goal>> {
    return this.http.patch<ApiResponse<Goal>>(`${this.apiUrl}/${id}`, data);
  }

  deleteGoal(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  allocateFunds(id: string, amount: number): Observable<ApiResponse<Goal>> {
    return this.http.post<ApiResponse<Goal>>(`${this.apiUrl}/${id}/allocate`, { amount });
  }

  withdrawFunds(id: string, amount: number): Observable<ApiResponse<Goal>> {
    return this.http.post<ApiResponse<Goal>>(`${this.apiUrl}/${id}/withdraw`, { amount });
  }
}

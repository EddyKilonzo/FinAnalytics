import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/budgets`;

  getBudgets(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getAlerts(): Observable<{ success: boolean; data: { budgetAlerts: any[]; nudges: any[] } }> {
    return this.http.get<{ success: boolean; data: { budgetAlerts: any[]; nudges: any[] } }>(
      `${this.apiUrl}/alerts`
    );
  }

  getBudget(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createBudget(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateBudget(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteBudget(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

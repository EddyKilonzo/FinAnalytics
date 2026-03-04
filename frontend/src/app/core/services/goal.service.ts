import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/goals`;

  getGoals(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getGoal(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createGoal(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateGoal(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteGoal(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  allocateFunds(id: string, amount: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/allocate`, { amount });
  }

  withdrawFunds(id: string, amount: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/withdraw`, { amount });
  }
}

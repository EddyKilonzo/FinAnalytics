import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Insight } from '../models';

// Backward-compat alias for components that import BackendInsight from here
export type BackendInsight = Insight;

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/analytics`;

  getInsights(): Observable<ApiResponse<Insight[]>> {
    return this.http.get<ApiResponse<Insight[]>>(`${this.apiUrl}/insights`);
  }
}

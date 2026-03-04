import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendInsight {
  id: string;
  type: string;
  message: string;
  severity?: 'info' | 'tip' | 'warning';
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/analytics`;

  getInsights(): Observable<{ success: boolean; data: BackendInsight[] }> {
    return this.http.get<{ success: boolean; data: BackendInsight[] }>(
      `${this.apiUrl}/insights`
    );
  }
}

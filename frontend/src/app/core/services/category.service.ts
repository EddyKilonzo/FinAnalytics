import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Category } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/categories`;

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl);
  }

  createCategory(body: { name: string; slug: string; color?: string; description?: string }): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(this.apiUrl, body);
  }

  updateCategory(id: string, body: { name?: string; slug?: string; color?: string; description?: string }): Observable<ApiResponse<Category>> {
    return this.http.patch<ApiResponse<Category>>(`${this.apiUrl}/${id}`, body);
  }

  deleteCategory(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /** Admin: upsert built-in categories (same as `npm run db:seed` in backend). */
  seedDefaultCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.post<ApiResponse<Category[]>>(`${this.apiUrl}/seed-defaults`, {});
  }
}

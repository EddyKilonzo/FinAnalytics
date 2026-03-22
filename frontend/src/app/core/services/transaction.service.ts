import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Transaction, TransactionSummary, CategoryBreakdown, TransactionListResult } from '../models';

export interface TransactionQuery {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  getTransactions(query?: TransactionQuery): Observable<ApiResponse<TransactionListResult>> {
    let params = new HttpParams();
    if (query) {
      if (query.page) params = params.set('page', query.page.toString());
      if (query.limit) params = params.set('limit', query.limit.toString());
      if (query.type) params = params.set('type', query.type);
      if (query.categoryId) params = params.set('categoryId', query.categoryId);
      if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
      if (query.dateTo) params = params.set('dateTo', query.dateTo);
    }
    return this.http.get<ApiResponse<TransactionListResult>>(this.apiUrl, { params });
  }

  getSummary(dateFrom?: string, dateTo?: string): Observable<ApiResponse<TransactionSummary>> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return this.http.get<ApiResponse<TransactionSummary>>(`${this.apiUrl}/summary`, { params });
  }

  getByCategory(dateFrom?: string, dateTo?: string): Observable<ApiResponse<CategoryBreakdown[]>> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return this.http.get<ApiResponse<CategoryBreakdown[]>>(`${this.apiUrl}/by-category`, { params });
  }

  getTransaction(id: string): Observable<ApiResponse<Transaction>> {
    return this.http.get<ApiResponse<Transaction>>(`${this.apiUrl}/${id}`);
  }

  createTransaction(data: Partial<Transaction>): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(this.apiUrl, data);
  }

  updateTransaction(id: string, data: Partial<Transaction>): Observable<ApiResponse<Transaction>> {
    return this.http.patch<ApiResponse<Transaction>>(`${this.apiUrl}/${id}`, data);
  }

  deleteTransaction(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  correctCategory(id: string, categoryId: string): Observable<ApiResponse<Transaction>> {
    return this.http.patch<ApiResponse<Transaction>>(`${this.apiUrl}/${id}/correct-category`, { categoryId });
  }

  exportCsv(params?: { dateFrom?: string; dateTo?: string; type?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    return this.http.get(`${this.apiUrl}/export`, { params: httpParams, responseType: 'blob' });
  }
}

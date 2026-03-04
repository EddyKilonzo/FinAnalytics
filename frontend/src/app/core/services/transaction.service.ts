import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  categoryId?: string;
  incomeSource?: string;
  suggestedCategoryId?: string;
  categoryConfidence?: number;
  category?: any;
  suggestedCategory?: any;
}

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

  getTransactions(query?: TransactionQuery): Observable<any> {
    let params = new HttpParams();
    if (query) {
      if (query.page) params = params.set('page', query.page.toString());
      if (query.limit) params = params.set('limit', query.limit.toString());
      if (query.type) params = params.set('type', query.type);
      if (query.categoryId) params = params.set('categoryId', query.categoryId);
      if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
      if (query.dateTo) params = params.set('dateTo', query.dateTo);
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  getSummary(dateFrom?: string, dateTo?: string): Observable<any> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }

  getByCategory(dateFrom?: string, dateTo?: string): Observable<any> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return this.http.get<any>(`${this.apiUrl}/by-category`, { params });
  }

  getTransaction(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createTransaction(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateTransaction(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteTransaction(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  correctCategory(id: string, categoryId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/correct-category`, { categoryId });
  }
}

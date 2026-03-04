import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lessons`;

  getLessons(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getLesson(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}

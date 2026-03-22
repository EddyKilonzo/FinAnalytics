import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, Lesson, LessonLeaderboardEntry, LessonProgressItem, SuggestedLesson } from '../models';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lessons`;

  getLessons(): Observable<ApiResponse<Lesson[]>> {
    return this.http.get<ApiResponse<Lesson[]>>(this.apiUrl);
  }

  getLesson(id: string): Observable<ApiResponse<Lesson>> {
    return this.http.get<ApiResponse<Lesson>>(`${this.apiUrl}/${id}`);
  }

  getSuggested(context: string): Observable<ApiResponse<SuggestedLesson[]>> {
    return this.http.get<ApiResponse<SuggestedLesson[]>>(`${this.apiUrl}/suggested`, {
      params: { context }
    });
  }

  getProgress(): Observable<ApiResponse<LessonProgressItem[]>> {
    return this.http.get<ApiResponse<LessonProgressItem[]>>(`${this.apiUrl}/progress`);
  }

  markComplete(idOrSlug: string, quiz?: { correctAnswers: number; totalQuestions: number }): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${idOrSlug}/complete`, quiz ?? {});
  }

  createLesson(lesson: Partial<Lesson>): Observable<ApiResponse<Lesson>> {
    return this.http.post<ApiResponse<Lesson>>(this.apiUrl, lesson);
  }

  updateLesson(idOrSlug: string, lesson: Partial<Lesson>): Observable<ApiResponse<Lesson>> {
    return this.http.patch<ApiResponse<Lesson>>(`${this.apiUrl}/${idOrSlug}`, lesson);
  }

  deleteLesson(idOrSlug: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${idOrSlug}`);
  }

  getLeaderboard(): Observable<ApiResponse<LessonLeaderboardEntry[]>> {
    return this.http.get<ApiResponse<LessonLeaderboardEntry[]>>(`${this.apiUrl}/leaderboard`);
  }

  // AI Draft management (admin only)
  getDrafts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/drafts`);
  }

  generateDraft(topic?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/drafts/generate`, { topic });
  }

  approveDraft(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/drafts/${id}/approve`, {});
  }

  rejectDraft(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/drafts/${id}/reject`, {});
  }

  deleteDraft(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/drafts/${id}`);
  }
}

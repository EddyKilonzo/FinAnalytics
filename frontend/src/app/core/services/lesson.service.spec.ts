import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LessonService } from './lesson.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/lessons`;

describe('LessonService', () => {
  let service: LessonService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(LessonService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getLessons() calls GET /lessons', () => {
    service.getLessons().subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('getLesson() calls GET /lessons/:id', () => {
    service.getLesson('budgeting-basics').subscribe();
    const req = http.expectOne(`${BASE}/budgeting-basics`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { id: '1', slug: 'budgeting-basics', title: 'Budgeting Basics', durationMinutes: 5, topics: [], summary: '' } });
  });

  it('getProgress() calls GET /lessons/progress', () => {
    service.getProgress().subscribe();
    const req = http.expectOne(`${BASE}/progress`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('markComplete() calls POST /lessons/:id/complete', () => {
    service.markComplete('budgeting-basics').subscribe();
    const req = http.expectOne(`${BASE}/budgeting-basics/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Lesson marked as complete' });
  });

  it('getSuggested() calls GET /lessons/suggested with context param', () => {
    service.getSuggested('first_goal').subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/suggested`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('context')).toBe('first_goal');
    req.flush({ success: true, data: [] });
  });

  it('getProgress() returns completion data for user', () => {
    let result: any;
    service.getProgress().subscribe(r => (result = r));
    const req = http.expectOne(`${BASE}/progress`);
    req.flush({
      success: true,
      data: [
        { lessonId: 'lesson-1', completedAt: '2026-03-15T10:00:00Z' },
        { lessonId: 'lesson-2', completedAt: '2026-03-16T10:00:00Z' },
      ]
    });
    expect(result.data.length).toBe(2);
    expect(result.data[0].lessonId).toBe('lesson-1');
  });
});

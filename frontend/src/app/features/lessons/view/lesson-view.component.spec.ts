import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { LessonViewComponent } from './lesson-view.component';
import { environment } from '../../../../environments/environment';

const BASE = `${environment.apiUrl}/lessons`;

const mockLesson = {
  id: 'lesson-1',
  title: 'Budgeting Basics',
  slug: 'budgeting-basics',
  durationMinutes: 5,
  topics: ['budgeting', 'saving'],
  summary: 'Learn to budget',
  body: '## Budgeting\nThis is the body.',
};

describe('LessonViewComponent', () => {
  let fixture: ComponentFixture<LessonViewComponent>;
  let component: LessonViewComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonViewComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'budgeting-basics' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LessonViewComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in loading state', () => {
    expect(component.isLoading()).toBeTrue();
    http.match(() => true).forEach(r => r.flush({ success: true, data: [] }));
  });

  it('loads lesson on init and clears loading', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(`${BASE}/budgeting-basics`).flush({ success: true, data: mockLesson });
    http.expectOne(`${BASE}/progress`).flush({ success: true, data: [] });
    tick(100);

    expect(component.isLoading()).toBeFalse();
    expect(component.lesson()).toBeTruthy();
    expect(component.lesson()!.title).toBe('Budgeting Basics');
  }));

  it('sets isCompleted = true if lesson is in progress', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(`${BASE}/budgeting-basics`).flush({ success: true, data: mockLesson });
    http.expectOne(`${BASE}/progress`).flush({
      success: true,
      data: [{ lessonId: 'budgeting-basics', completedAt: '2026-03-15T10:00:00Z' }]
    });
    tick(100);

    expect(component.isCompleted()).toBeTrue();
  }));

  it('sets isCompleted = false if lesson not in progress', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(`${BASE}/budgeting-basics`).flush({ success: true, data: mockLesson });
    http.expectOne(`${BASE}/progress`).flush({ success: true, data: [] });
    tick(100);

    expect(component.isCompleted()).toBeFalse();
  }));

  it('markComplete() calls POST /lessons/:id/complete', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/budgeting-basics`).flush({ success: true, data: mockLesson });
    http.expectOne(`${BASE}/progress`).flush({ success: true, data: [] });
    tick(100);

    component.markComplete();

    const req = http.expectOne(`${BASE}/budgeting-basics/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Lesson marked as complete' });
    tick();

    expect(component.isCompleted()).toBeTrue();
  }));

  it('markComplete() does nothing if already completed', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/budgeting-basics`).flush({ success: true, data: mockLesson });
    http.expectOne(`${BASE}/progress`).flush({
      success: true,
      data: [{ lessonId: 'budgeting-basics', completedAt: '2026-03-15T10:00:00Z' }]
    });
    tick(100);

    component.markComplete(); // should not make HTTP call
    http.expectNone(`${BASE}/budgeting-basics/complete`);
  }));
});

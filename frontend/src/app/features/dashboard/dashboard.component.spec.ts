import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { environment } from '../../../environments/environment';

const TX_BASE = `${environment.apiUrl}/transactions`;
const BUDGET_BASE = `${environment.apiUrl}/budgets`;
const GOAL_BASE = `${environment.apiUrl}/goals`;

const emptySummary = { success: true, data: { totalIncome: 0, totalExpenses: 0, balance: 0, incomeBySource: [] } };
const emptyCategories = { success: true, data: [] };
const emptyAlerts = { success: true, data: { budgetAlerts: [], nudges: [] } };
const emptyGoals = { success: true, data: [] };

function flushAll(http: HttpTestingController, dateRange = '6months') {
  // summary, by-category, alerts, goals, and 6 monthly summaries
  http.expectOne(r => r.url === `${TX_BASE}/summary` && !r.params.has('dateFrom')).flush(emptySummary);
  // or with date params — use match to flush any pending
  const summaryReqs = http.match(r => r.url === `${TX_BASE}/summary`);
  summaryReqs.forEach(r => r.flush(emptySummary));

  const catReqs = http.match(r => r.url === `${TX_BASE}/by-category`);
  catReqs.forEach(r => r.flush(emptyCategories));

  http.expectOne(`${BUDGET_BASE}/alerts`).flush(emptyAlerts);
  http.expectOne(GOAL_BASE).flush(emptyGoals);
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with isLoading = true', () => {
    expect(component.isLoading).toBeTrue();
    // flush to avoid pending request errors
    http.match(() => true).forEach(r => r.flush(emptySummary));
  });

  it('sets isLoading = false after data loads', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit

    // flush all pending requests
    http.match(() => true).forEach(r => {
      const url = r.request.url;
      if (url.includes('/summary')) r.flush(emptySummary);
      else if (url.includes('/by-category')) r.flush(emptyCategories);
      else if (url.includes('/alerts')) r.flush(emptyAlerts);
      else if (url.includes('/goals')) r.flush(emptyGoals);
      else r.flush({});
    });
    tick();

    expect(component.isLoading).toBeFalse();
  }));

  it('loads summary card values from API response', fakeAsync(() => {
    fixture.detectChanges();

    http.match(() => true).forEach(r => {
      const url = r.request.url;
      if (url.includes('/summary')) {
        r.flush({ success: true, data: { totalIncome: 50000, totalExpenses: 30000, balance: 20000, incomeBySource: [] } });
      } else if (url.includes('/by-category')) {
        r.flush(emptyCategories);
      } else if (url.includes('/alerts')) {
        r.flush(emptyAlerts);
      } else if (url.includes('/goals')) {
        r.flush(emptyGoals);
      } else {
        r.flush({});
      }
    });
    tick();

    expect(component.monthlyIncome).toBe(50000);
    expect(component.monthlySpending).toBe(30000);
    expect(component.totalBalance).toBe(20000);
  }));

  it('sets hasNoDataForPeriod when income and expenses are both 0', fakeAsync(() => {
    component.dateRange = '30days';
    fixture.detectChanges();

    http.match(() => true).forEach(r => {
      const url = r.request.url;
      if (url.includes('/summary')) r.flush(emptySummary);
      else if (url.includes('/by-category')) r.flush(emptyCategories);
      else if (url.includes('/alerts')) r.flush(emptyAlerts);
      else if (url.includes('/goals')) r.flush(emptyGoals);
      else r.flush({});
    });
    tick();

    expect(component.hasNoDataForPeriod).toBeTrue();
  }));

  it('populates goals from API', fakeAsync(() => {
    fixture.detectChanges();

    http.match(() => true).forEach(r => {
      const url = r.request.url;
      if (url.includes('/summary')) r.flush(emptySummary);
      else if (url.includes('/by-category')) r.flush(emptyCategories);
      else if (url.includes('/alerts')) r.flush(emptyAlerts);
      else if (url.includes('/goals')) {
        r.flush({ success: true, data: [
          { id: 'g1', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 3000, status: 'on_track' },
          { id: 'g2', name: 'Laptop', targetAmount: 80000, currentAmount: 5000, status: 'in_progress' },
        ]});
      } else {
        r.flush({});
      }
    });
    tick();

    expect(component.activeGoalsCount).toBe(2);
    expect(component.goalsOnTrackCount).toBe(2);
    expect(component.goals.length).toBeGreaterThanOrEqual(1);
  }));

  it('getGoalProgress returns capped 0-100 value', () => {
    expect(component.getGoalProgress(500, 1000)).toBe(50);
    expect(component.getGoalProgress(1500, 1000)).toBe(100);
    expect(component.getGoalProgress(0, 0)).toBe(0);
  });

  it('dismissNudge removes the nudge and saves to localStorage', () => {
    component.nudges = [
      { id: 'n1', type: 'weekend_overspend_pattern', message: 'Watch out', severity: 'info' },
      { id: 'n2', type: 'under_budget', message: 'Great job', severity: 'info' },
    ];
    component.dismissNudge('n1');
    expect(component.nudges.length).toBe(1);
    expect(component.nudges[0].id).toBe('n2');
    const stored = JSON.parse(localStorage.getItem('dismissedNudges') ?? '[]') as string[];
    expect(stored).toContain('n1');
  });

  it('dismissed nudges are filtered on loadDashboardData', fakeAsync(() => {
    // Pre-dismiss a nudge id
    localStorage.setItem('dismissedNudges', JSON.stringify(['weekend_overspend']));

    component['dismissedNudgeIds'] = new Set(['weekend_overspend']);
    fixture.detectChanges();

    http.match(() => true).forEach(r => {
      const url = r.request.url;
      if (url.includes('/summary')) r.flush(emptySummary);
      else if (url.includes('/by-category')) r.flush(emptyCategories);
      else if (url.includes('/alerts')) {
        r.flush({ success: true, data: {
          budgetAlerts: [],
          nudges: [
            { id: 'weekend_overspend', type: 'weekend_overspend_pattern', message: 'Watch out', severity: 'info' },
          ]
        }});
      } else if (url.includes('/goals')) r.flush(emptyGoals);
      else r.flush({});
    });
    tick();

    expect(component.nudges.length).toBe(0);
    localStorage.removeItem('dismissedNudges');
  }));
});

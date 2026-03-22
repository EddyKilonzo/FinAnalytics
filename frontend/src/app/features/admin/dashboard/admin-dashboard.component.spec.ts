import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { environment } from '../../../../environments/environment';

const ADMIN_BASE = `${environment.apiUrl}/admin`;

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let http: HttpTestingController;

  const mockDashboard = {
    success: true,
    data: { totalUsers: 250, totalTransactions: 4200, totalBudgets: 180, totalGoals: 130, recentSignups: 14 }
  };

  const mockMonthly = {
    success: true,
    data: [
      { label: 'Oct 25', transactions: 45, users: 3 },
      { label: 'Nov 25', transactions: 60, users: 5 },
      { label: 'Dec 25', transactions: 70, users: 8 },
      { label: 'Jan 26', transactions: 55, users: 4 },
      { label: 'Feb 26', transactions: 80, users: 10 },
      { label: 'Mar 26', transactions: 40, users: 6 },
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in loading state', () => {
    expect(component.isLoading).toBeTrue();
    http.match(() => true).forEach(r => r.flush({}));
  });

  it('sets isLoading = false after data loads', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).flush(mockDashboard);
    http.expectOne(`${ADMIN_BASE}/stats/monthly`).flush(mockMonthly);
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('populates stats cards from dashboard API', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).flush(mockDashboard);
    http.expectOne(`${ADMIN_BASE}/stats/monthly`).flush(mockMonthly);
    tick();

    expect(component.stats.length).toBe(4);
    const userCard = component.stats.find(s => s.title === 'Total Users');
    expect(userCard).toBeTruthy();
    expect(userCard!.value).toBe('250');
    expect(userCard!.trendClass).toBe('positive');
  }));

  it('wires bar chart labels from monthly stats', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).flush(mockDashboard);
    http.expectOne(`${ADMIN_BASE}/stats/monthly`).flush(mockMonthly);
    tick();

    expect(component.barChartData.labels?.length).toBe(6);
    expect(component.barChartData.labels?.[0]).toBe('Oct 25');
  }));

  it('wires bar chart transaction data', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).flush(mockDashboard);
    http.expectOne(`${ADMIN_BASE}/stats/monthly`).flush(mockMonthly);
    tick();

    const txDataset = component.barChartData.datasets[0];
    expect(txDataset.data).toEqual([45, 60, 70, 55, 80, 40]);
  }));

  it('wires bar chart user signup data', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).flush(mockDashboard);
    http.expectOne(`${ADMIN_BASE}/stats/monthly`).flush(mockMonthly);
    tick();

    const userDataset = component.barChartData.datasets[1];
    expect(userDataset.data).toEqual([3, 5, 8, 4, 10, 6]);
  }));

  it('handles API error gracefully', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ADMIN_BASE}/dashboard`).error(new ErrorEvent('Network error'));
    // forkJoin cancels the monthly request when dashboard errors; drain any remaining
    http.match(() => true).forEach(r => { try { r.flush(mockMonthly); } catch { /* cancelled */ } });
    tick();

    expect(component.isLoading).toBeFalse();
    expect(component.stats.length).toBe(0);
  }));
});

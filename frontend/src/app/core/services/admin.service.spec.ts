import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/admin`;

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDashboard() calls GET /admin/dashboard', () => {
    service.getDashboard().subscribe();
    const req = http.expectOne(`${BASE}/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { totalUsers: 0, totalTransactions: 0, totalBudgets: 0, totalGoals: 0, recentSignups: 0 } });
  });

  it('getMonthlyStats() calls GET /admin/stats/monthly', () => {
    service.getMonthlyStats().subscribe();
    const req = http.expectOne(`${BASE}/stats/monthly`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('getDashboard() returns typed stats', () => {
    let result: any;
    service.getDashboard().subscribe(r => (result = r));
    const req = http.expectOne(`${BASE}/dashboard`);
    req.flush({
      success: true,
      data: { totalUsers: 120, totalTransactions: 3450, totalBudgets: 80, totalGoals: 65, recentSignups: 12 }
    });
    expect(result.data.totalUsers).toBe(120);
    expect(result.data.recentSignups).toBe(12);
  });

  it('getMonthlyStats() returns month label and counts', () => {
    let result: any;
    service.getMonthlyStats().subscribe(r => (result = r));
    const req = http.expectOne(`${BASE}/stats/monthly`);
    req.flush({
      success: true,
      data: [
        { label: 'Oct 25', transactions: 45, users: 3 },
        { label: 'Nov 25', transactions: 60, users: 5 },
      ]
    });
    expect(result.data.length).toBe(2);
    expect(result.data[0].label).toBe('Oct 25');
    expect(result.data[1].transactions).toBe(60);
  });

  it('getTransactions() calls GET /admin/transactions with pagination', () => {
    service.getTransactions(2, 10).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/transactions`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ success: true, data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });
  });
});

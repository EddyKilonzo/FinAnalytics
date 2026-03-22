import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BudgetService } from './budget.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/budgets`;

describe('BudgetService', () => {
  let service: BudgetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(BudgetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getBudgets() calls GET /budgets', () => {
    service.getBudgets().subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('getAlerts() calls GET /budgets/alerts', () => {
    service.getAlerts().subscribe();
    const req = http.expectOne(`${BASE}/alerts`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { budgetAlerts: [], nudges: [] } });
  });

  it('createBudget() calls POST /budgets with payload', () => {
    const payload = { categoryId: 'cat1', limitAmount: 5000, period: 'month', startAt: '2026-03-01', endAt: '2026-03-31' };
    service.createBudget(payload).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { id: 'b1', ...payload } });
  });

  it('updateBudget() calls PATCH /budgets/:id', () => {
    service.updateBudget('b1', { limitAmount: 6000 }).subscribe();
    const req = http.expectOne(`${BASE}/b1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: {} });
  });

  it('deleteBudget() calls DELETE /budgets/:id', () => {
    service.deleteBudget('b1').subscribe();
    const req = http.expectOne(`${BASE}/b1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: null });
  });

  it('getAlerts() response parses budgetAlerts and nudges', () => {
    let result: any;
    service.getAlerts().subscribe(r => (result = r));
    const req = http.expectOne(`${BASE}/alerts`);
    req.flush({
      success: true,
      data: {
        budgetAlerts: [{ id: 'b1', alertStatus: 'near', percentageUsed: 85 }],
        nudges: [{ id: 'weekend_overspend', type: 'weekend_overspend_pattern', message: 'Watch weekend spend', severity: 'info' }]
      }
    });
    expect(result.data.budgetAlerts.length).toBe(1);
    expect(result.data.nudges.length).toBe(1);
    expect(result.data.nudges[0].id).toBe('weekend_overspend');
  });
});

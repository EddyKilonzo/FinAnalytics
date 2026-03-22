import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GoalService } from './goal.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/goals`;

describe('GoalService', () => {
  let service: GoalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GoalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getGoals() calls GET /goals', () => {
    service.getGoals().subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('getGoal() calls GET /goals/:id', () => {
    service.getGoal('g1').subscribe();
    const req = http.expectOne(`${BASE}/g1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { id: 'g1', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 0 } });
  });

  it('createGoal() calls POST /goals', () => {
    const payload = { name: 'Laptop', targetAmount: 80000, deadline: '2026-12-31' };
    service.createGoal(payload).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { id: 'g2', ...payload, currentAmount: 0 } });
  });

  it('updateGoal() calls PATCH /goals/:id', () => {
    service.updateGoal('g1', { targetAmount: 12000 }).subscribe();
    const req = http.expectOne(`${BASE}/g1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ targetAmount: 12000 });
    req.flush({ success: true, data: {} });
  });

  it('deleteGoal() calls DELETE /goals/:id', () => {
    service.deleteGoal('g1').subscribe();
    const req = http.expectOne(`${BASE}/g1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: null });
  });

  it('allocateFunds() calls POST /goals/:id/allocate with amount', () => {
    service.allocateFunds('g1', 500).subscribe();
    const req = http.expectOne(`${BASE}/g1/allocate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 500 });
    req.flush({ success: true, data: { id: 'g1', currentAmount: 500 } });
  });

  it('withdrawFunds() calls POST /goals/:id/withdraw with amount', () => {
    service.withdrawFunds('g1', 200).subscribe();
    const req = http.expectOne(`${BASE}/g1/withdraw`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 200 });
    req.flush({ success: true, data: { id: 'g1', currentAmount: 300 } });
  });
});

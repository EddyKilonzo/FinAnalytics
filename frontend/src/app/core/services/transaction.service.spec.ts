import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TransactionService } from './transaction.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/transactions`;

describe('TransactionService', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getTransactions() calls GET /transactions', () => {
    service.getTransactions().subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { transactions: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('getTransactions() passes query params', () => {
    service.getTransactions({ type: 'expense', dateFrom: '2026-01-01', dateTo: '2026-01-31', limit: 50 }).subscribe();
    const req = http.expectOne(r => r.url === BASE);
    expect(req.request.params.get('type')).toBe('expense');
    expect(req.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({ success: true, data: { transactions: [], total: 0, page: 1, limit: 50, totalPages: 0 } });
  });

  it('getSummary() calls GET /transactions/summary without params', () => {
    service.getSummary().subscribe();
    const req = http.expectOne(`${BASE}/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { totalIncome: 0, totalExpenses: 0, balance: 0, incomeBySource: [] } });
  });

  it('getSummary() passes date range params', () => {
    service.getSummary('2026-01-01', '2026-01-31').subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/summary`);
    expect(req.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(req.request.params.get('dateTo')).toBe('2026-01-31');
    req.flush({ success: true, data: { totalIncome: 5000, totalExpenses: 3000, balance: 2000, incomeBySource: [] } });
  });

  it('getByCategory() calls GET /transactions/by-category', () => {
    service.getByCategory('2026-01-01', '2026-01-31').subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/by-category`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('createTransaction() calls POST /transactions', () => {
    const payload = { amount: 100, type: 'expense' as const, description: 'Lunch' };
    service.createTransaction(payload).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { id: 'tx1', ...payload, date: new Date().toISOString() } });
  });

  it('updateTransaction() calls PATCH /transactions/:id', () => {
    service.updateTransaction('tx1', { amount: 200 }).subscribe();
    const req = http.expectOne(`${BASE}/tx1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: {} });
  });

  it('deleteTransaction() calls DELETE /transactions/:id', () => {
    service.deleteTransaction('tx1').subscribe();
    const req = http.expectOne(`${BASE}/tx1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: null });
  });

  it('correctCategory() calls PATCH /transactions/:id/correct-category', () => {
    service.correctCategory('tx1', 'cat1').subscribe();
    const req = http.expectOne(`${BASE}/tx1/correct-category`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ categoryId: 'cat1' });
    req.flush({ success: true, data: {} });
  });
});

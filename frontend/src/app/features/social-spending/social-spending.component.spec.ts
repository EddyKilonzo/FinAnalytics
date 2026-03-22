import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SocialSpendingComponent } from './social-spending.component';
import { environment } from '../../../environments/environment';

const TX_BASE = `${environment.apiUrl}/transactions`;
const BUDGET_BASE = `${environment.apiUrl}/budgets`;

const mockSocialTx = {
  id: 'tx1', amount: 500, type: 'expense', description: 'Party at club',
  date: '2026-03-10T00:00:00Z',
  category: { id: 'c1', name: 'Social', slug: 'social', color: '#8b5cf6' }
};

const mockBudgets = [
  {
    id: 'b1', limitAmount: 3000, period: 'month',
    category: { id: 'c1', name: 'Social', slug: 'social', color: '#8b5cf6' },
    totalSpent: 500, remaining: 2500, percentageUsed: 16.7, alertStatus: 'ok', isSocial: true
  }
];

describe('SocialSpendingComponent', () => {
  let fixture: ComponentFixture<SocialSpendingComponent>;
  let component: SocialSpendingComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialSpendingComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialSpendingComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in loading state', () => {
    expect(component.isLoading).toBeTrue();
    http.match(() => true).forEach(r => r.flush({ success: true, data: [] }));
  });

  it('loads and filters social transactions', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(r => r.url === TX_BASE).flush({
      success: true,
      data: {
        transactions: [
          mockSocialTx,
          { id: 'tx2', amount: 200, type: 'expense', description: 'Coffee', category: { slug: 'food-dining' } }
        ]
      }
    });
    http.expectOne(BUDGET_BASE).flush({ success: true, data: mockBudgets });
    tick();

    expect(component.transactions.length).toBe(1);
    expect(component.transactions[0].id).toBe('tx1');
    expect(component.totalSpent).toBe(500);
  }));

  it('calculates budget percentage correctly', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(r => r.url === TX_BASE).flush({ success: true, data: { transactions: [mockSocialTx] } });
    http.expectOne(BUDGET_BASE).flush({ success: true, data: mockBudgets });
    tick();

    // 500 / 3000 * 100 = 16.67
    expect(component.budgetPct).toBeCloseTo(16.67, 1);
    expect(component.budget).toBeTruthy();
  }));

  it('shows no budget when no social budget exists', fakeAsync(() => {
    fixture.detectChanges();

    http.expectOne(r => r.url === TX_BASE).flush({ success: true, data: { transactions: [] } });
    http.expectOne(BUDGET_BASE).flush({ success: true, data: [] });
    tick();

    expect(component.budget).toBeNull();
    expect(component.budgetPct).toBe(0);
  }));

  it('reloads data on period change', fakeAsync(() => {
    fixture.detectChanges();

    // initial load
    http.match(() => true).forEach(r => r.flush({ success: true, data: [] }));
    tick();

    component.selectedPeriod = '90';
    component.onPeriodChange();

    // second load
    http.match(() => true).forEach(r => r.flush({ success: true, data: [] }));
    tick();

    expect(component.isLoading).toBeFalse();
  }));

  it('periodLabel returns correct label', () => {
    component.selectedPeriod = '30';
    expect(component.periodLabel).toBe('Last 30 days');
    component.selectedPeriod = '90';
    expect(component.periodLabel).toBe('Last 3 months');
    component.selectedPeriod = '180';
    expect(component.periodLabel).toBe('Last 6 months');
  });
});

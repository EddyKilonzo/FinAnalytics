import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AdminService } from '../../../core/services/admin.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import {
  lucideDownload,
  lucideSearch,
  lucideArrowUpRight,
  lucideArrowDownRight,
  lucideCreditCard,
  lucideWallet,
  lucideLoader2,
  lucideUser,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, NgIconComponent, CurrencyFormatPipe],
  providers: [
    provideIcons({
      lucideDownload, lucideSearch,
      lucideArrowUpRight, lucideArrowDownRight,
      lucideCreditCard, lucideWallet,
      lucideLoader2, lucideUser,
    })
  ],
  template: `
    <div class="admin-container fade-in">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Transactions</h1>
          <p class="admin-subtitle">Monitor system-wide financial movements</p>
        </div>
        <button class="btn-export">
          <ng-icon name="lucideDownload" size="16"></ng-icon>
          Export CSV
        </button>
      </div>

      <!-- ── Controls ───────────────────────────────────────────── -->
      <div class="controls-bar">
        <div class="search-box">
          <ng-icon name="lucideSearch" class="search-icon" size="15"></ng-icon>
          <input
            type="text"
            placeholder="Search user, description, amount…"
            class="search-input"
            [value]="searchQuery"
            (input)="searchQuery = $any($event.target).value"
          />
        </div>

        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="statusFilter === 'all'"       (click)="statusFilter = 'all'">All</button>
          <button type="button" class="pill income"  [class.active]="statusFilter === 'income'"   (click)="statusFilter = 'income'">Income</button>
          <button type="button" class="pill expense" [class.active]="statusFilter === 'expense'"  (click)="statusFilter = 'expense'">Expense</button>
        </div>

        @if (!isLoading) {
          <span class="result-count">
            {{ filteredTransactions.length }} of {{ transactions.length }} transactions
          </span>
        }
      </div>

      <!-- ── Loading ────────────────────────────────────────────── -->
      @if (isLoading) {
        <div class="loading-state">
          <ng-icon name="lucideLoader2" class="spin" size="32"></ng-icon>
          <p>Loading transactions…</p>
        </div>
      }

      <!-- ── Empty ──────────────────────────────────────────────── -->
      @if (!isLoading && filteredTransactions.length === 0) {
        <div class="empty-state">
          <ng-icon name="lucideCreditCard" size="36"></ng-icon>
          <p class="empty-title">No transactions found</p>
          <p class="empty-sub">{{ transactions.length > 0 ? 'Try adjusting your search.' : 'No data loaded yet.' }}</p>
        </div>
      }

      <!-- ── Cards grid ─────────────────────────────────────────── -->
      @if (!isLoading && filteredTransactions.length > 0) {
        <div class="txn-grid slide-up">
          @for (txn of filteredTransactions; track txn.id; let i = $index) {
            <div class="tx-card" [style.animation-delay]="i * 0.035 + 's'">

              <!-- Type stripe -->
              <div class="tx-stripe" [class.income]="txn.type === 'income'" [class.expense]="txn.type !== 'income'"></div>

              <div class="tx-body">

                <!-- Top: icon + amount -->
                <div class="tx-top">
                  <div class="tx-icon" [class.income]="txn.type === 'income'" [class.expense]="txn.type !== 'income'">
                    <ng-icon [name]="txn.type === 'income' ? 'lucideArrowDownRight' : 'lucideArrowUpRight'" size="18"></ng-icon>
                  </div>
                  <span class="tx-amount" [class.income]="txn.type === 'income'" [class.expense]="txn.type !== 'income'">
                    {{ txn.type === 'income' ? '+' : '−' }}{{ txn.amount | fmt }}
                  </span>
                </div>

                <!-- Description -->
                <p class="tx-desc">{{ txn.description }}</p>
                <p class="tx-id">{{ txn.id }}</p>

                <!-- User row -->
                <div class="tx-user">
                  <div class="avatar">{{ txn.userInitials }}</div>
                  <span class="user-name">{{ txn.userName }}</span>
                </div>

                <!-- Footer: status + date -->
                <div class="tx-footer">
                  <span class="status-badge" [ngClass]="txn.statusClass">{{ txn.status }}</span>
                  <span class="tx-date">{{ txn.date }}</span>
                </div>

              </div>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .admin-container { padding: 2.5rem 2rem; max-width: 1400px; margin: 0 auto; }
    .fade-in  { animation: fadeIn  0.45s ease-out forwards; }
    .slide-up { animation: slideUp 0.5s  cubic-bezier(0.16,1,0.3,1) forwards; }
    @keyframes fadeIn  { from { opacity: 0; }                        to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Header ─────────────────────────────────────────────────── */
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .admin-title { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.4rem 0; letter-spacing: -0.03em; }
    .admin-subtitle { margin: 0; font-size: 1.1rem; color: #a3c4ad !important; }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.4rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-medium);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-export:hover { background: var(--surface-alt); }

    /* ── Controls ────────────────────────────────────────────────── */
    .controls-bar {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex-wrap: wrap;
      margin-bottom: 1.75rem;
    }

    .search-box { position: relative; }
    .search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-primary); opacity: 0.4; pointer-events: none; }
    .search-input {
      width: 260px;
      padding: 0.6rem 1rem 0.6rem 2.4rem;
      background: var(--surface);
      border: 1px solid var(--border-medium);
      border-radius: 999px;
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input::placeholder { color: var(--text-primary); opacity: 0.35; }
    .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

    .filter-pills {
      display: flex;
      background: var(--surface);
      border: 1px solid var(--border-medium);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }
    .pill {
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      opacity: 0.5;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.18s;
    }
    .pill.active { background: var(--surface-raised); opacity: 1; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
    .pill.income.active  { color: #22c55e; }
    .pill.expense.active { color: #f87171; }

    .result-count { font-size: 0.82rem; color: var(--text-primary); opacity: 0.45; margin-left: auto; }

    /* ── Loading / Empty ─────────────────────────────────────────── */
    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 2rem;
      color: var(--text-primary); opacity: 0.55; gap: 0.75rem; text-align: center;
    }
    .spin { animation: spin 1s linear infinite; color: var(--accent); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .empty-sub   { font-size: 0.875rem; margin: 0; }

    /* ── Cards grid ──────────────────────────────────────────────── */
    .txn-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 1.25rem;
    }

    /* ── Transaction card ────────────────────────────────────────── */
    .tx-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow:
        rgba(50,50,93,0.12) 0px 20px 40px -12px,
        rgba(0,0,0,0.16) 0px 10px 22px -10px;
      opacity: 0;
      animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
      transition: transform 0.28s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.28s;
    }
    .tx-card:hover {
      transform: translateY(-5px);
      box-shadow:
        rgba(50,50,93,0.2) 0px 30px 60px -12px,
        rgba(0,0,0,0.22) 0px 18px 36px -18px;
    }
    @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

    .tx-stripe { height: 4px; width: 100%; flex-shrink: 0; }
    .tx-stripe.income  { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .tx-stripe.expense { background: linear-gradient(90deg, #f87171, #ef4444); }

    .tx-body { padding: 1.25rem 1.375rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }

    /* Top */
    .tx-top { display: flex; justify-content: space-between; align-items: center; }
    .tx-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .tx-icon.income  { background: rgba(34,197,94,0.14);  color: #22c55e; }
    .tx-icon.expense { background: rgba(248,113,113,0.14); color: #f87171; }

    .tx-amount { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; }
    .tx-amount.income  { color: #22c55e; }
    .tx-amount.expense { color: #f87171; }

    /* Description + ID */
    .tx-desc {
      font-size: 0.925rem; font-weight: 700;
      color: var(--text-primary); margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tx-id {
      font-size: 0.72rem; font-family: ui-monospace, monospace;
      color: var(--text-primary); opacity: 0.4; margin: -0.4rem 0 0 0;
    }

    /* User */
    .tx-user { display: flex; align-items: center; gap: 0.6rem; }
    .avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--accent-dim); color: var(--accent);
      border: 1.5px solid var(--accent-glow);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 800; flex-shrink: 0;
    }
    .user-name { font-size: 0.825rem; font-weight: 600; color: var(--text-primary); opacity: 0.75; }

    /* Footer */
    .tx-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);
    }
    .status-badge {
      display: inline-flex; align-items: center;
      padding: 0.22rem 0.65rem; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; text-transform: capitalize;
    }
    .status-completed { background: rgba(34,197,94,0.12);  color: #22c55e; }
    .status-pending   { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .status-failed    { background: rgba(239,68,68,0.1);   color: #f87171; }
    .status-default   { background: var(--surface-alt); color: var(--text-primary); opacity: 0.7; }

    .tx-date { font-size: 0.76rem; color: var(--text-primary); opacity: 0.4; }

    @media (max-width: 640px) {
      .admin-container { padding: 1.5rem 1rem; }
      .search-input { width: 100%; }
      .txn-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminTransactionsComponent implements OnInit {
  private adminService = inject(AdminService);

  transactions: any[] = [];
  searchQuery = '';
  statusFilter: 'all' | 'income' | 'expense' = 'all';
  isLoading = true;

  get filteredTransactions(): any[] {
    let list = this.transactions;
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.id?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        String(t.amount || '').includes(q)
      );
    }
    if (this.statusFilter !== 'all') {
      list = list.filter(t => t.type === this.statusFilter);
    }
    return list;
  }

  ngOnInit() { this.fetchTransactions(); }

  fetchTransactions() {
    this.isLoading = true;
    this.adminService.getTransactions().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.transactions = response.data.map((t: any) => {
            const status = (t.status || 'completed').toLowerCase();
            return {
              id: t.id ? 'TXN-' + t.id.substring(0, 8).toUpperCase() : 'N/A',
              description: t.description || t.title || 'Unknown',
              type: (t.type || 'expense').toLowerCase(),
              userInitials: this.getInitials(t.user?.name || 'U'),
              userName: t.user?.name || 'Unknown User',
              status: status.charAt(0).toUpperCase() + status.slice(1),
              statusClass: this.statusClass(status),
              date: t.date ? new Date(t.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
              amount: t.amount || 0,
            };
          });
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private statusClass(status: string): string {
    if (status === 'completed') return 'status-completed';
    if (status === 'pending')   return 'status-pending';
    if (status === 'failed')    return 'status-failed';
    return 'status-default';
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || 'U';
  }
}

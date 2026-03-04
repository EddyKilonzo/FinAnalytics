import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AdminService } from '../../../core/services/admin.service';
import { 
  lucideDownload, 
  lucideSearch, 
  lucideFilter,
  lucideArrowUpRight,
  lucideArrowDownRight,
  lucideRefreshCw,
  lucideCreditCard,
  lucideWallet,
  lucideMoreHorizontal
} from '@ng-icons/lucide';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideDownload, 
      lucideSearch, 
      lucideFilter,
      lucideArrowUpRight,
      lucideArrowDownRight,
      lucideRefreshCw,
      lucideCreditCard,
      lucideWallet,
      lucideMoreHorizontal
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Transactions</h1>
          <p class="admin-subtitle">Monitor system-wide financial movements</p>
        </div>
        <div class="admin-actions">
          <button class="btn-secondary">
            <ng-icon name="lucideFilter"></ng-icon> Filter
          </button>
          <button class="btn-primary">
            <ng-icon name="lucideDownload"></ng-icon> Export CSV
          </button>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-state fade-in">
        <div class="spinner"></div>
        <p>Loading transactions...</p>
      </div>

      <div *ngIf="!isLoading" class="fin-card-elevated table-container slide-up">
        <div class="table-header flex-between">
          <div class="search-bar">
            <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
            <input 
              type="text" 
              placeholder="Search ID, user, or amount..." 
              class="search-input"
              [value]="searchQuery"
              (input)="searchQuery = $any($event.target).value"
            >
          </div>
          <div class="table-tabs">
            <button 
              class="tab" 
              [class.active]="statusFilter === 'all'"
              (click)="statusFilter = 'all'"
            >All</button>
            <button 
              class="tab" 
              [class.active]="statusFilter === 'completed'"
              (click)="statusFilter = 'completed'"
            >Completed</button>
            <button 
              class="tab" 
              [class.active]="statusFilter === 'pending'"
              (click)="statusFilter = 'pending'"
            >Pending</button>
            <button 
              class="tab" 
              [class.active]="statusFilter === 'failed'"
              (click)="statusFilter = 'failed'"
            >Failed</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Transaction Details</th>
                <th>User</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date & Time</th>
                <th class="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let txn of transactions" class="table-row">
                <td>
                  <div class="txn-info">
                    <div class="txn-icon" [ngClass]="txn.type === 'income' ? 'bg-green-light' : 'bg-red-light'">
                      <ng-icon [name]="txn.type === 'income' ? 'lucideArrowDownRight' : 'lucideArrowUpRight'"></ng-icon>
                    </div>
                    <div class="txn-details">
                      <span class="txn-desc">{{ txn.description }}</span>
                      <span class="txn-id">{{ txn.id }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="user-inline">
                    <div class="avatar-small">{{ txn.userInitials }}</div>
                    <span>{{ txn.userName }}</span>
                  </div>
                </td>
                <td>
                  <div class="method-badge">
                    <ng-icon [name]="txn.methodIcon"></ng-icon>
                    {{ txn.method }}
                  </div>
                </td>
                <td>
                  <span class="status-indicator" [ngClass]="txn.status.toLowerCase()">
                    {{ txn.status }}
                  </span>
                </td>
                <td class="text-muted">{{ txn.date }}</td>
                <td class="text-right">
                  <span class="txn-amount" [ngClass]="txn.type === 'income' ? 'positive' : 'negative'">
                    {{ txn.type === 'income' ? '+' : '-' }}{{ txn.amount | currency:'KES':'symbol':'1.0-0' }}
                  </span>
                </td>
                <td class="text-right">
                  <button class="btn-icon">
                    <ng-icon name="lucideMoreHorizontal"></ng-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2.5rem;
    }

    .admin-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: white;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.03em;
    }

    .admin-subtitle {
      color: rgba(255,255,255,0.6);
      margin: 0;
      font-size: 1.1rem;
    }

    .admin-actions { display: flex; gap: 1rem; }

    .btn-primary, .btn-secondary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem; border-radius: 12px;
      font-weight: 600; cursor: pointer; transition: all 0.3s;
      font-size: 0.95rem; border: none;
    }

    .btn-primary { background: var(--accent, #3b82f6); color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); }
    .btn-secondary { background: var(--surface-alt, #f3f4f6); color: var(--text-primary, #111827); }
    .btn-secondary:hover { background: var(--surface-hover, #e5e7eb); transform: translateY(-2px); }

    .fin-card-elevated {
      background: var(--card-bg, #ffffff);
      border-radius: 24px; padding: 0; overflow: hidden;
      /* MANDATORY Box-shadow */
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, 
                  rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, 
                  rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .fin-card-elevated:hover { transform: translateY(-4px); }

    .table-header { padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-light, #e5e7eb); background: var(--surface-light, #fafafa); }
    .flex-between { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }

    .search-bar { position: relative; width: 100%; max-width: 350px; }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted, #9ca3af); }
    .search-input {
      width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem;
      border-radius: 10px; border: 1px solid var(--border-medium, #d1d5db);
      background: var(--bg-primary, #ffffff); font-size: 0.95rem; transition: all 0.2s;
    }
    .search-input:focus { outline: none; border-color: var(--accent, #3b82f6); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

    .table-tabs { display: flex; gap: 0.5rem; background: var(--surface-alt, #f3f4f6); padding: 0.25rem; border-radius: 10px; }
    .tab {
      padding: 0.5rem 1rem; border: none; background: transparent;
      border-radius: 8px; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary, #6b7280);
      cursor: pointer; transition: all 0.2s;
    }
    .tab.active { background: var(--bg-primary, #ffffff); color: var(--text-primary, #111827); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

    .table-responsive { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
    .admin-table th { padding: 1rem 2rem; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light, #e5e7eb); background: var(--surface-light, #fafafa); }
    .admin-table td { padding: 1.25rem 2rem; border-bottom: 1px solid var(--border-light, #e5e7eb); vertical-align: middle; }
    .table-row { transition: background-color 0.2s; }
    .table-row:hover { background-color: var(--surface-hover-subtle, #f9fafb); }

    .txn-info { display: flex; align-items: center; gap: 1rem; }
    .txn-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
    .bg-green-light { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
    .bg-red-light { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
    
    .txn-details { display: flex; flex-direction: column; }
    .txn-desc { font-weight: 600; color: white; font-size: 0.95rem; }
    .txn-id { font-size: 0.8rem; color: var(--text-muted, #9ca3af); margin-top: 0.125rem; font-family: monospace; }

    .user-inline { display: flex; align-items: center; gap: 0.75rem; font-weight: 500; font-size: 0.9rem; }
    .avatar-small { width: 28px; height: 28px; border-radius: 50%; background: var(--accent, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }

    .method-badge { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.85rem; color: var(--text-secondary, #6b7280); }

    .status-indicator { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
    .status-indicator.completed { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
    .status-indicator.pending { background: rgba(245, 158, 11, 0.1); color: #d97706; }
    .status-indicator.failed { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

    .text-muted { color: var(--text-muted, #9ca3af); font-size: 0.9rem; }
    .text-right { text-align: right; }
    
    .txn-amount { font-weight: 700; font-size: 1.05rem; }
    .txn-amount.positive { color: #16a34a; }
    .txn-amount.negative { color: var(--text-primary, #111827); }

    .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary, #6b7280); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
    .btn-icon:hover { background: var(--surface-hover, #e5e7eb); color: var(--text-primary, #111827); }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 4rem; color: var(--text-secondary, #6b7280);
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid rgba(59, 130, 246, 0.2);
      border-radius: 50%; border-top-color: var(--accent, #3b82f6);
      animation: spin 1s ease-in-out infinite; margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AdminTransactionsComponent implements OnInit {
  private adminService = inject(AdminService);
  
  transactions: any[] = [];
  searchQuery = '';
  statusFilter: 'all' | 'completed' | 'pending' | 'failed' = 'all';
  isLoading = true;

  get filteredTransactions(): any[] {
    let list = this.transactions;
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        t =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.userName && t.userName.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          String(t.amount || '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter !== 'all') {
      list = list.filter(t => (t.status || '').toLowerCase() === this.statusFilter);
    }
    return list;
  }

  ngOnInit() {
    this.fetchTransactions();
  }

  fetchTransactions() {
    this.isLoading = true;
    this.adminService.getTransactions().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.transactions = response.data.map((t: any) => ({
            id: t.id ? 'TXN-' + t.id.substring(0, 6).toUpperCase() : 'N/A',
            description: t.title || t.description || 'Unknown',
            type: t.type?.toLowerCase() || 'expense',
            userInitials: this.getInitials(t.user?.name || 'U'),
            userName: t.user?.name || 'Unknown User',
            method: t.method || 'Bank Transfer',
            methodIcon: 'lucideWallet',
            status: t.status || 'Completed',
            date: t.date ? new Date(t.date).toLocaleString() : 'N/A',
            amount: t.amount || 0
          }));
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching transactions:', error);
        this.isLoading = false;
      }
    });
  }

  private getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0] ? parts[0].charAt(0).toUpperCase() : 'U';
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideEdit2,
  lucideTrash2,
  lucideSearch,
  lucideShield,
  lucideUserX,
  lucideCheckCircle2,
  lucideUser,
  lucideX,
  lucideRefreshCw,
  lucidePauseCircle,
  lucidePlayCircle,
} from '@ng-icons/lucide';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEdit2,
      lucideTrash2,
      lucideSearch,
      lucideShield,
      lucideUserX,
      lucideCheckCircle2,
      lucideUser,
      lucideX,
      lucideRefreshCw,
      lucidePauseCircle,
      lucidePlayCircle,
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Users Management</h1>
          <p class="admin-subtitle">Manage platform users, roles, and permissions</p>
        </div>
      </div>

      <div class="toolbar fin-card-elevated slide-up">
        <div class="search-bar">
          <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
          <input
            type="text"
            placeholder="Search users by name or email..."
            class="search-input"
            [(ngModel)]="searchQuery"
          >
        </div>
        <p class="toolbar-count" *ngIf="!loading && !error">
          {{ filteredUsers.length }} user{{ filteredUsers.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div *ngIf="loading" class="state-block">
        <p class="state-text">Loading users...</p>
      </div>

      <div *ngIf="error" class="state-block state-error">
        <p>{{ error }}</p>
        <button class="btn-secondary state-retry" (click)="fetchUsers()">
          <ng-icon name="lucideRefreshCw"></ng-icon> Try Again
        </button>
      </div>

      <div *ngIf="!loading && !error" class="users-grid">
        <article
          *ngFor="let user of filteredUsers"
          class="user-card"
          [style.border-color]="user.borderColor"
        >
          <div class="user-card-top">
            <div
              class="avatar-ring"
              [style.border-color]="user.borderColor"
              [style.color]="user.borderColor"
            >
              <span class="avatar-initials">{{ user.initials }}</span>
            </div>
            <div class="user-card-heading">
              <h2 class="user-card-name">{{ user.name }}</h2>
              <p class="user-card-email">{{ user.email }}</p>
            </div>
          </div>
          <div class="user-card-meta">
            <span class="role-badge" [ngClass]="user.role.toLowerCase()">
              <ng-icon [name]="user.roleIcon"></ng-icon>
              {{ user.role }}
            </span>
            <span class="status-indicator" [ngClass]="user.status.toLowerCase()">
              <ng-icon [name]="user.statusIcon"></ng-icon>
              {{ user.status }}
            </span>
          </div>
          <p class="user-card-joined">
            <span class="joined-label">Joined</span>
            <span class="joined-value">{{ user.joined }}</span>
          </p>
          <div class="user-card-actions">
            <button type="button" class="btn-card" title="Edit user" (click)="openEdit(user)">
              <ng-icon name="lucideEdit2"></ng-icon>
              Edit
            </button>
            <button
              type="button"
              class="btn-card"
              [title]="user.status === 'Suspended' ? 'Unsuspend user' : 'Suspend user'"
              (click)="toggleSuspend(user)"
              [disabled]="user.busy"
            >
              <ng-icon [name]="user.status === 'Suspended' ? 'lucidePlayCircle' : 'lucidePauseCircle'"></ng-icon>
              {{ user.status === 'Suspended' ? 'Unsuspend' : 'Suspend' }}
            </button>
            <button type="button" class="btn-card btn-card-danger" title="Delete user" (click)="openDelete(user)">
              <ng-icon name="lucideTrash2"></ng-icon>
              Delete
            </button>
          </div>
        </article>
        <p *ngIf="filteredUsers.length === 0" class="empty-grid">No users match your search.</p>
      </div>
    </div>

    <!-- ── Edit User Modal ──────────────────────────────────── -->
    <div class="modal-overlay" *ngIf="editingUser" (click)="closeEdit()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Edit User</h2>
          <button class="btn-icon" (click)="closeEdit()"><ng-icon name="lucideX"></ng-icon></button>
        </div>
        <div class="modal-body">
          <p class="modal-user-email">{{ editingUser.email }}</p>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" [(ngModel)]="editName" placeholder="Full name">
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <select class="form-input" [(ngModel)]="editRole">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="modal-error" *ngIf="editError">{{ editError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeEdit()">Cancel</button>
          <button class="btn-primary" (click)="saveEdit()" [disabled]="editSaving">
            {{ editSaving ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ─────────────────────────────── -->
    <div class="modal-overlay" *ngIf="deletingUser" (click)="closeDelete()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Delete User</h2>
          <button class="btn-icon" (click)="closeDelete()"><ng-icon name="lucideX"></ng-icon></button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-primary); margin: 0 0 0.5rem 0;">
            Are you sure you want to permanently delete <strong>{{ deletingUser.name }}</strong>?
          </p>
          <p style="color: #dc2626; font-size: 0.9rem; margin: 0;">
            This will delete all their transactions, budgets, and goals. This cannot be undone.
          </p>
          <div class="modal-error" *ngIf="deleteError">{{ deleteError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeDelete()">Cancel</button>
          <button class="btn-danger" (click)="confirmDelete()" [disabled]="deleteSaving">
            {{ deleteSaving ? 'Deleting…' : 'Delete User' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2.5rem; max-width: 1400px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .admin-title { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0; letter-spacing: -0.03em; }
    .admin-subtitle { margin: 0; font-size: 1rem; color: #a3c4ad !important; }
    .btn-primary, .btn-secondary, .btn-danger {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-size: 0.95rem; border: none;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--surface-alt); color: var(--text-primary); border: 1px solid var(--border-subtle); }
    .btn-secondary:hover { background: var(--surface-raised); }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .fin-card-elevated {
      background: var(--card-bg); border-radius: 24px; padding: 0; overflow: hidden;
      box-shadow: rgba(50,50,93,0.25) 0px 50px 100px -20px, rgba(0,0,0,0.3) 0px 30px 60px -30px;
      border: 1px solid var(--border-subtle);
    }
    .toolbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem 1.5rem;
      padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;
      background: var(--card-bg);
    }
    .toolbar .search-bar { flex: 1; min-width: 220px; max-width: 420px; }
    .toolbar-count { margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); opacity: 0.6; }
    .search-bar { position: relative; }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .search-input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 10px; border: 1px solid var(--border-medium); background: var(--surface); color: var(--text-primary); font-size: 0.95rem; transition: all 0.2s; box-sizing: border-box; }
    .search-input::placeholder { color: var(--text-muted); }
    .search-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
    .state-block { text-align: center; padding: 3rem 1.5rem; color: var(--text-primary); opacity: 0.6; }
    .state-error p { color: #dc2626; opacity: 1; margin: 0 0 1rem 0; }
    .state-retry { margin-top: 0; }
    .state-text { margin: 0; }
    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 1.25rem;
      align-items: stretch;
    }
    .user-card {
      background: var(--card-bg);
      border-radius: 20px;
      border: 2px solid var(--border-medium);
      padding: 1.25rem 1.35rem 1.15rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      display: flex; flex-direction: column; gap: 1rem;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .user-card:hover { box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18); transform: translateY(-2px); }
    .user-card-top { display: flex; align-items: flex-start; gap: 1rem; }
    .avatar-ring {
      width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface); border: 2px solid var(--border-medium);
      font-weight: 800; font-size: 1rem; color: var(--text-primary);
    }
    .avatar-initials { line-height: 1; }
    .user-card-heading { min-width: 0; flex: 1; }
    .user-card-name { margin: 0 0 0.25rem 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); line-height: 1.25; }
    .user-card-email { margin: 0; font-size: 0.8125rem; color: var(--text-primary); opacity: 0.55; word-break: break-word; }
    .user-card-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .user-card-joined { margin: 0; font-size: 0.8125rem; color: var(--text-primary); opacity: 0.6; display: flex; flex-wrap: wrap; gap: 0.35rem 0.65rem; align-items: baseline; }
    .joined-label { font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.7rem; opacity: 0.7; }
    .joined-value { font-weight: 500; }
    .user-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; padding-top: 0.25rem; border-top: 1px solid var(--border-subtle); }
    .btn-card {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.5rem 0.75rem; border-radius: 10px; font-size: 0.8125rem; font-weight: 600;
      border: 1px solid var(--border-medium); background: var(--surface); color: var(--text-primary);
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
    }
    .btn-card:hover:not(:disabled) { background: var(--surface-raised); border-color: var(--border-medium); }
    .btn-card:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-card-danger { border-color: rgba(220, 38, 38, 0.4); color: #ef4444; }
    .btn-card-danger:hover:not(:disabled) { background: rgba(220, 38, 38, 0.08); border-color: #dc2626; }
    .empty-grid { grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-primary); opacity: 0.5; margin: 0; }
    .role-badge, .status-indicator { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .role-badge.admin { background: rgba(147,51,234,0.15); color: #c084fc; }
    .role-badge.user { background: var(--surface); color: var(--text-primary); opacity: 0.85; }
    .status-indicator.active { background: rgba(34,197,94,0.15); color: #4ade80; }
    .status-indicator.suspended { background: rgba(239,68,68,0.15); color: #f87171; }
    .status-indicator.pending { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .text-muted { color: var(--text-primary); opacity: 0.5; font-size: 0.9rem; }
    .text-right { text-align: right; }
    .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; color: var(--text-primary); opacity: 0.6; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
    .btn-icon:hover:not(:disabled) { background: var(--surface); opacity: 1; }
    .btn-icon.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; opacity: 1; }
    .btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-panel { background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 20px; width: 100%; max-width: 460px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.75rem; border-bottom: 1px solid var(--border-subtle); }
    .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .modal-body { padding: 1.5rem 1.75rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.75rem; border-top: 1px solid var(--border-subtle); }
    .modal-user-email { color: var(--text-primary); opacity: 0.55; font-size: 0.9rem; margin: 0 0 1.25rem 0; }
    .modal-error { color: #f87171; font-size: 0.875rem; margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(239,68,68,0.1); border-radius: 8px; }
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); opacity: 0.75; margin-bottom: 0.5rem; }
    .form-input { width: 100%; padding: 0.65rem 0.9rem; border: 1px solid var(--border-medium); border-radius: 10px; font-size: 0.95rem; background: var(--surface); color: var(--text-primary); transition: border-color 0.2s; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
  `]
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);

  users: any[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  // Edit modal
  editingUser: any = null;
  editName = '';
  editRole = '';
  editSaving = false;
  editError = '';

  // Delete modal
  deletingUser: any = null;
  deleteSaving = false;
  deleteError = '';

  get filteredUsers(): any[] {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(
      u => (u.name && u.name.toLowerCase().includes(q)) ||
           (u.email && u.email.toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.loading = true;
    this.error = '';
    this.adminService.getUsers().subscribe({
      next: (response) => {
        this.users = (response.data ?? []).map((user: any) => this.mapUser(user));
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
      }
    });
  }

  openEdit(user: any) {
    this.editingUser = user;
    this.editName = user.name;
    this.editRole = user.rawRole;
    this.editError = '';
  }

  closeEdit() {
    this.editingUser = null;
  }

  saveEdit() {
    if (!this.editingUser) return;
    this.editSaving = true;
    this.editError = '';
    this.adminService.updateUser(this.editingUser.id, {
      name: this.editName.trim() || undefined,
      role: this.editRole || undefined,
    }).subscribe({
      next: (res) => {
        const updated = this.mapUser(res.data);
        const idx = this.users.findIndex(u => u.id === this.editingUser.id);
        if (idx > -1) this.users[idx] = updated;
        this.editSaving = false;
        this.editingUser = null;
      },
      error: (err) => {
        this.editError = err?.error?.message ?? 'Failed to update user.';
        this.editSaving = false;
      }
    });
  }

  toggleSuspend(user: any) {
    user.busy = true;
    const action$ = user.status === 'Suspended'
      ? this.adminService.unsuspendUser(user.id)
      : this.adminService.suspendUser(user.id);

    action$.subscribe({
      next: (res) => {
        const updated = this.mapUser(res.data);
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx > -1) this.users[idx] = updated;
      },
      error: () => { user.busy = false; }
    });
  }

  openDelete(user: any) {
    this.deletingUser = user;
    this.deleteError = '';
  }

  closeDelete() {
    this.deletingUser = null;
  }

  confirmDelete() {
    if (!this.deletingUser) return;
    this.deleteSaving = true;
    this.deleteError = '';
    this.adminService.deleteUser(this.deletingUser.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== this.deletingUser.id);
        this.deleteSaving = false;
        this.deletingUser = null;
      },
      error: (err) => {
        this.deleteError = err?.error?.message ?? 'Failed to delete user.';
        this.deleteSaving = false;
      }
    });
  }

  private mapUser(user: any): any {
    const isSuspended = !!user.suspendedAt;
    const status = isSuspended ? 'Suspended' : (user.emailVerifiedAt ? 'Active' : 'Pending');
    const statusIcon = isSuspended ? 'lucideUserX' : 'lucideCheckCircle2';
    const rawRole = user.role ?? 'USER';
    const roleIcon = rawRole === 'ADMIN' ? 'lucideShield' : 'lucideUser';
    const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    const nameToUse = user.name || user.email || 'Unknown';
    const nameParts = nameToUse.split(' ');
    const initials = nameParts.length > 1
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameToUse.substring(0, 2).toUpperCase();
    const borderColors = ['#22c55e', '#235347', '#16a34a', '#ea580c', '#f59e0b'];
    const colorIndex = user.id ? user.id.charCodeAt(user.id.length - 1) % borderColors.length : 0;
    return {
      id: user.id,
      name: user.name || 'Unknown User',
      email: user.email,
      initials,
      borderColor: borderColors[colorIndex],
      role,
      rawRole,
      roleIcon,
      status,
      statusIcon,
      busy: false,
      joined: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  }
}

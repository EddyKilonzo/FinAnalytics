import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucidePlus, 
  lucideEdit2, 
  lucideTrash2, 
  lucideSearch, 
  lucideFilter,
  lucideShield,
  lucideUserX,
  lucideCheckCircle2,
  lucideUser
} from '@ng-icons/lucide';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucidePlus, 
      lucideEdit2, 
      lucideTrash2, 
      lucideSearch, 
      lucideFilter,
      lucideShield,
      lucideUserX,
      lucideCheckCircle2,
      lucideUser
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Users Management</h1>
          <p class="admin-subtitle">Manage platform users, roles, and permissions</p>
        </div>
        <div class="admin-actions">
          <button class="btn-secondary">
            <ng-icon name="lucideFilter"></ng-icon> Filter
          </button>
          <button class="btn-primary">
            <ng-icon name="lucidePlus"></ng-icon> Add User
          </button>
        </div>
      </div>

      <div class="fin-card-elevated table-container slide-up">
        <div class="table-header">
          <div class="search-bar">
            <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              class="search-input"
              [value]="searchQuery"
              (input)="searchQuery = $any($event.target).value"
            >
          </div>
        </div>

        <div class="table-responsive">
          <div *ngIf="loading" class="p-8 text-center text-muted" style="padding: 3rem; text-align: center;">
            <p>Loading users...</p>
          </div>
          
          <div *ngIf="error" class="p-8 text-center" style="padding: 3rem; text-align: center; color: #dc2626;">
            <p>{{ error }}</p>
            <button class="btn-secondary" style="margin-top: 1rem;" (click)="fetchUsers()">Try Again</button>
          </div>

          <table *ngIf="!loading && !error" class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers" class="table-row">
                <td>
                  <div class="user-info">
                    <div class="avatar" [ngClass]="user.color">
                      {{ user.initials }}
                    </div>
                    <div class="user-details">
                      <span class="user-name">{{ user.name }}</span>
                      <span class="user-email">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-badge" [ngClass]="user.role.toLowerCase()">
                    <ng-icon [name]="user.roleIcon"></ng-icon>
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="status-indicator" [ngClass]="user.status.toLowerCase()">
                    <ng-icon [name]="user.statusIcon"></ng-icon>
                    {{ user.status }}
                  </span>
                </td>
                <td class="text-muted">{{ user.joined }}</td>
                <td class="text-right">
                  <div class="action-buttons">
                    <button class="btn-icon" title="Edit">
                      <ng-icon name="lucideEdit2"></ng-icon>
                    </button>
                    <button class="btn-icon danger" title="Delete">
                      <ng-icon name="lucideTrash2"></ng-icon>
                    </button>
                  </div>
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

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

    .admin-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.95rem;
      border: none;
    }

    .btn-primary {
      background: var(--accent, #3b82f6);
      color: #fff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4);
    }

    .btn-secondary {
      background: var(--surface-alt, #f3f4f6);
      color: var(--text-primary, #111827);
    }

    .btn-secondary:hover {
      background: var(--surface-hover, #e5e7eb);
      transform: translateY(-2px);
    }

    .fin-card-elevated {
      background: var(--card-bg, #ffffff);
      border-radius: 24px;
      padding: 0;
      overflow: hidden;
      /* MANDATORY Box-shadow */
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, 
                  rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, 
                  rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .fin-card-elevated:hover {
      transform: translateY(-4px);
    }

    .table-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border-light, #e5e7eb);
      background: var(--surface-light, #fafafa);
    }

    .search-bar {
      position: relative;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, #9ca3af);
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      border-radius: 10px;
      border: 1px solid var(--border-medium, #d1d5db);
      background: var(--bg-primary, #ffffff);
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .admin-table th {
      padding: 1rem 2rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-light, #e5e7eb);
      background: var(--surface-light, #fafafa);
    }

    .admin-table td {
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border-light, #e5e7eb);
      vertical-align: middle;
    }

    .table-row {
      transition: background-color 0.2s;
    }

    .table-row:hover {
      background-color: var(--surface-hover-subtle, #f9fafb);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    .bg-blue { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    .bg-purple { background: linear-gradient(135deg, #c084fc, #9333ea); }
    .bg-green { background: linear-gradient(135deg, #4ade80, #16a34a); }
    .bg-orange { background: linear-gradient(135deg, #fb923c, #ea580c); }
    .bg-pink { background: linear-gradient(135deg, #f472b6, #db2777); }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      color: white;
      font-size: 1rem;
    }

    .user-email {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.55);
      margin-top: 0.125rem;
    }

    .role-badge, .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Roles */
    .role-badge.admin { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
    .role-badge.manager { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .role-badge.user { background: rgba(107, 114, 128, 0.1); color: #4b5563; }

    /* Statuses */
    .status-indicator.active { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
    .status-indicator.suspended { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
    .status-indicator.pending { background: rgba(245, 158, 11, 0.1); color: #d97706; }

    .text-muted {
      color: var(--text-muted, #9ca3af);
      font-size: 0.9rem;
    }

    .text-right {
      text-align: right;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #6b7280);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: var(--surface-hover, #e5e7eb);
      color: var(--text-primary, #111827);
    }

    .btn-icon.danger:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  
  users: any[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  get filteredUsers(): any[] {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(
      u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.loading = true;
    this.error = '';
    
    this.http.get<{success: boolean, data: any[]}>(`${environment.apiUrl}/users`).subscribe({
      next: (response) => {
        this.users = response.data.map(user => {
          const isSuspended = !!user.suspendedAt;
          const status = isSuspended ? 'Suspended' : (user.emailVerifiedAt ? 'Active' : 'Pending');
          const statusIcon = isSuspended ? 'lucideUserX' : 'lucideCheckCircle2';
          
          let roleIcon = 'lucideUser';
          if (user.role === 'ADMIN') roleIcon = 'lucideShield';
          
          const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'User';
          
          const nameToUse = user.name || user.email || 'Unknown';
          const nameParts = nameToUse.split(' ');
          const initials = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : nameToUse.substring(0, 2).toUpperCase();
            
          const colors = ['bg-blue', 'bg-purple', 'bg-green', 'bg-orange', 'bg-pink'];
          const colorIndex = user.id ? user.id.charCodeAt(user.id.length - 1) % colors.length : 0;
          
          return {
            id: user.id,
            name: user.name || 'Unknown User',
            email: user.email,
            initials,
            color: colors[colorIndex],
            role,
            roleIcon,
            status,
            statusIcon,
            joined: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
      }
    });
  }
}

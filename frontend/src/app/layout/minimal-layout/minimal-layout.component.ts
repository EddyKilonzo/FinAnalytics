import { Component, inject, signal, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideBarChart2,
  lucideArrowLeftRight,
  lucideWallet,
  lucideTarget,
  lucideTag,
  lucideBookOpen,
  lucideUsers,
  lucideShield,
  lucideUser,
  lucideLogOut,
  lucideChevronLeft,
  lucideBell,
  lucideSearch,
  lucideTrendingUp,
  lucideSun,
  lucideMoon,
  lucideMenu,
  lucideX,
  lucideSettings,
  lucideMessageSquare,
  lucideChevronDown,
} from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme.service';
import { FooterComponent } from '../../shared/footer/footer.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-minimal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, NgIconComponent, FooterComponent],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideBarChart2,
      lucideArrowLeftRight,
      lucideWallet,
      lucideTarget,
      lucideTag,
      lucideBookOpen,
      lucideUsers,
      lucideShield,
      lucideUser,
      lucideLogOut,
      lucideChevronLeft,
      lucideBell,
      lucideSearch,
      lucideTrendingUp,
      lucideSun,
      lucideMoon,
      lucideMenu,
      lucideX,
      lucideSettings,
      lucideMessageSquare,
      lucideChevronDown,
    }),
  ],
  templateUrl: './minimal-layout.component.html',
  styleUrl: './minimal-layout.component.css',
})
export class MinimalLayoutComponent {
  protected auth = inject(AuthService);
  protected theme = inject(ThemeService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  userMenuOpen = signal(false);

  protected readonly currentUserSig = toSignal(this.auth.currentUser$, {
    initialValue: this.auth.getCurrentUser(),
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'lucideLayoutDashboard', route: '/dashboard' },
    { label: 'Analytics', icon: 'lucideBarChart2', route: '/analytics' },
    { label: 'Transactions', icon: 'lucideArrowLeftRight', route: '/transactions' },
    { label: 'Budgets', icon: 'lucideWallet', route: '/budgets' },
    { label: 'Goals', icon: 'lucideTarget', route: '/goals' },
    { label: 'Categories', icon: 'lucideTag', route: '/categories' },
    { label: 'Lessons', icon: 'lucideBookOpen', route: '/lessons' },
    { label: 'Social', icon: 'lucideMessageSquare', route: '/social' },
  ];

  readonly adminItems: NavItem[] = [
    { label: 'Overview', icon: 'lucideLayoutDashboard', route: '/admin', adminOnly: true },
    { label: 'Manage Users', icon: 'lucideUsers', route: '/admin/users', adminOnly: true },
    { label: 'Transactions', icon: 'lucideArrowLeftRight', route: '/admin/transactions', adminOnly: true },
    { label: 'Budgets', icon: 'lucideWallet', route: '/admin/budgets', adminOnly: true },
    { label: 'Goals', icon: 'lucideTarget', route: '/admin/goals', adminOnly: true },
  ];

  get visibleNavItems(): NavItem[] {
    return this.navItems;
  }

  get isAdmin(): boolean {
    return this.currentUserSig()?.role === 'ADMIN';
  }

  get currentUser() {
    return this.currentUserSig();
  }

  get userInitials(): string {
    const user = this.currentUserSig();
    if (!user) return '?';
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const name = user.name ?? fullName;
    if (!name) return user.email?.[0]?.toUpperCase() ?? '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  get displayName(): string {
    const user = this.currentUserSig();
    if (!user) return '';
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return (user.name ?? fullName) || user.email?.split('@')[0] || '';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topbar-user')) {
      this.userMenuOpen.set(false);
    }
  }
}

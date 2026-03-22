import { Component, HostListener, OnInit, inject, signal, ElementRef } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrendingUp,
  lucideArrowRight,
  lucideStar,
  lucideSun,
  lucideMoon,
  lucideLayoutDashboard,
  lucideUser,
  lucideLogOut,
  lucideShield,
  lucideBell,
  lucideAlertTriangle,
  lucideAlertCircle,
  lucideLightbulb,
  lucideCheckCircle2,
  lucideX,
} from '@ng-icons/lucide';
import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { BudgetService } from '../../core/services/budget.service';

interface Notification {
  id: string;
  icon: string;
  iconClass: string;
  title: string;
  message: string;
  severity: 'over' | 'near' | 'info';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, NgIconComponent, AsyncPipe, NgClass],
  providers: [
    provideIcons({
      lucideTrendingUp,
      lucideArrowRight,
      lucideStar,
      lucideSun,
      lucideMoon,
      lucideLayoutDashboard,
      lucideUser,
      lucideLogOut,
      lucideShield,
      lucideBell,
      lucideAlertTriangle,
      lucideAlertCircle,
      lucideLightbulb,
      lucideCheckCircle2,
      lucideX,
    }),
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  protected isScrolled = false;
  protected notifOpen = signal(false);
  protected notifications = signal<Notification[]>([]);
  protected loading = signal(false);

  private el = inject(ElementRef);
  protected theme = inject(ThemeService);
  protected auth = inject(AuthService);
  private budgetService = inject(BudgetService);

  get unreadCount(): number {
    return this.notifications().length;
  }

  ngOnInit(): void {
    // Load alerts once the user is confirmed logged in
    this.auth.currentUser$.subscribe(user => {
      if (user) this.fetchAlerts();
    });
  }

  protected toggleNotif(): void {
    this.notifOpen.update(v => !v);
    if (this.notifOpen() && this.notifications().length === 0 && !this.loading()) {
      this.fetchAlerts();
    }
  }

  protected closeNotif(): void {
    this.notifOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
  }

  private fetchAlerts(): void {
    this.loading.set(true);
    this.budgetService.getAlerts().subscribe({
      next: (res) => {
        const data = res?.data;
        const items: Notification[] = [];

        // Budget alerts
        for (const b of (data?.budgetAlerts ?? [])) {
          const catName = b.category?.name ?? 'Budget';
          if (b.alertStatus === 'over') {
            items.push({
              id: 'budget-' + b.id,
              icon: 'lucideAlertCircle',
              iconClass: 'notif-icon-over',
              title: `${catName} over budget`,
              message: `You've exceeded your ${catName} budget limit.`,
              severity: 'over',
            });
          } else if (b.alertStatus === 'near') {
            items.push({
              id: 'budget-' + b.id,
              icon: 'lucideAlertTriangle',
              iconClass: 'notif-icon-near',
              title: `${catName} near limit`,
              message: `${Math.round(b.percentageUsed)}% of your ${catName} budget used.`,
              severity: 'near',
            });
          }
        }

        // Nudges / insights
        for (const n of (data?.nudges ?? [])) {
          items.push({
            id: 'nudge-' + n.id,
            icon: 'lucideLightbulb',
            iconClass: 'notif-icon-info',
            title: 'Spending Insight',
            message: n.message,
            severity: 'info',
          });
        }

        this.notifications.set(items);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }

  // Close dropdown when clicking outside the navbar bell area
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.notifOpen() && !this.el.nativeElement.contains(e.target)) {
      this.notifOpen.set(false);
    }
  }
}

import { Component, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';
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
} from '@ng-icons/lucide';
import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, NgIconComponent, AsyncPipe],
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
    }),
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  protected isScrolled = false;

  constructor(
    protected theme: ThemeService,
    protected auth: AuthService,
  ) {}

  protected logout(): void {
    this.auth.logout();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }
}

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrendingUp,
  lucideArrowRight,
  lucideStar,
  lucideSun,
  lucideMoon,
  lucideMail,
  lucideCheck,
  lucideZap,
  lucideShieldCheck,
  lucideCpu,
  lucideSmartphone,
  lucideBell,
  lucideDownload,
  lucideBarChart3,
  lucideReceipt,
  lucideUsers,
  lucideLayout,
  lucideGauge,
  lucideTarget,
  lucideGraduationCap,
  lucideFileText,
  lucideMessageSquare,
  lucideHelpCircle,
  lucideRocket,
  lucideLock,
  lucideMessageCircle,
  lucideHeart,
  lucideTwitter,
  lucideLinkedin,
  lucideInstagram,
  lucideGithub,
  lucideLayoutDashboard,
  lucideCreditCard,
  lucidePieChart,
  lucideChevronRight,
  lucideCheckCircle,
  lucideArrowDown,
  lucideBus,
  lucideWallet,
  lucideUtensilsCrossed,
  lucideBanknote,
} from '@ng-icons/lucide';
import { ThemeService } from '../../core/theme.service';

export type HeroIntent = 'personal' | 'small' | 'enterprise';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideTrendingUp,
      lucideArrowRight,
      lucideStar,
      lucideSun,
      lucideMoon,
      lucideMail,
      lucideCheck,
      lucideZap,
      lucideShieldCheck,
      lucideCpu,
      lucideSmartphone,
      lucideBell,
      lucideDownload,
      lucideBarChart3,
      lucideReceipt,
      lucideUsers,
      lucideLayout,
      lucideGauge,
      lucideTarget,
      lucideGraduationCap,
      lucideFileText,
      lucideMessageSquare,
      lucideHelpCircle,
      lucideRocket,
      lucideLock,
      lucideMessageCircle,
      lucideHeart,
      lucideTwitter,
      lucideLinkedin,
      lucideInstagram,
      lucideGithub,
      lucideLayoutDashboard,
      lucideCreditCard,
      lucidePieChart,
      lucideChevronRight,
      lucideCheckCircle,
      lucideArrowDown,
      lucideBus,
      lucideWallet,
      lucideUtensilsCrossed,
      lucideBanknote,
    }),
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit {
  protected heroIntent: HeroIntent = 'personal';
  protected heroEmail = '';

  constructor(protected theme: ThemeService) {}

  ngOnInit(): void {}

  protected setIntent(value: HeroIntent): void {
    this.heroIntent = value;
  }

  protected getStarted(): void {
    window.location.href = '/auth/register';
  }
}

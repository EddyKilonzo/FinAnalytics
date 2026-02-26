import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import type { Subscription } from 'rxjs';
import AOS from 'aos';
import { BeamsBackgroundComponent } from './shared/beams/beams-background.component';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BeamsBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private routerSub?: Subscription;

  constructor(
    private theme: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      offset: 50,
      once: true,
      startEvent: 'DOMContentLoaded',
    });
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => AOS.refresh());
    this.routerSub = sub;
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrendingUp,
  lucideTwitter,
  lucideLinkedin,
  lucideInstagram,
  lucideGithub,
  lucideHeart,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, NgIconComponent],
  providers: [
    provideIcons({
      lucideTrendingUp,
      lucideTwitter,
      lucideLinkedin,
      lucideInstagram,
      lucideGithub,
      lucideHeart,
    }),
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
}

import { Component } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideHeart,
  lucideTrendingUp,
  lucideTwitter,
  lucideLinkedin,
  lucideGithub,
  lucideMail,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [NgIconComponent],
  providers: [
    provideIcons({ lucideHeart, lucideTrendingUp, lucideTwitter, lucideLinkedin, lucideGithub, lucideMail }),
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
}

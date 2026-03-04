import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideBookOpen, lucideClock, lucideArrowRight, lucideTrendingUp, lucideWallet, lucidePieChart } from '@ng-icons/lucide';
import { LessonService } from '../../../core/services/lesson.service';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  published: boolean;
}

@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './lesson-list.component.html',
  styleUrls: ['./lesson-list.component.css'],
  viewProviders: [
    provideIcons({ lucideBookOpen, lucideClock, lucideArrowRight, lucideTrendingUp, lucideWallet, lucidePieChart })
  ]
})
export class LessonListComponent implements OnInit {
  private lessonService = inject(LessonService);
  
  lessons = signal<Lesson[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.lessonService.getLessons().subscribe({
      next: (response) => {
        this.lessons.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching lessons:', error);
        this.isLoading.set(false);
      }
    });
  }

  getIconForCategory(category: string): string {
    switch (category.toLowerCase()) {
      case 'investing':
        return 'lucideTrendingUp';
      case 'personal finance':
        return 'lucideWallet';
      default:
        return 'lucidePieChart';
    }
  }
}

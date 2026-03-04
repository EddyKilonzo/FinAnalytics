import { Component, OnInit, ViewEncapsulation, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideClock, lucideCalendar, lucideShare2 } from '@ng-icons/lucide';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LessonService } from '../../../core/services/lesson.service';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  published: boolean;
  content?: string;
}

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './lesson-view.component.html',
  styleUrls: ['./lesson-view.component.css'],
  encapsulation: ViewEncapsulation.None, // Needed for markdown styles to apply
  viewProviders: [
    provideIcons({ lucideArrowLeft, lucideClock, lucideCalendar, lucideShare2 })
  ]
})
export class LessonViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private lessonService = inject(LessonService);

  lesson = signal<Lesson | undefined>(undefined);
  parsedContent = signal<SafeHtml>('');
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.lessonService.getLesson(id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.lesson.set(response.data);
            if (response.data.content) {
              this.parseMarkdown(response.data.content);
            }
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error fetching lesson:', error);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  async parseMarkdown(content: string) {
    const rawHtml = await marked.parse(content);
    this.parsedContent.set(this.sanitizer.bypassSecurityTrustHtml(rawHtml));
  }
}

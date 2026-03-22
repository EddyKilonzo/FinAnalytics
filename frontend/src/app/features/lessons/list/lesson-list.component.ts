import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen, lucideClock, lucideArrowRight, lucideTrendingUp, lucideWallet,
  lucidePieChart, lucideRefreshCw, lucideCheckCircle, lucideAward, lucideMedal,
  lucideTrophy, lucideX, lucideInfo,
} from '@ng-icons/lucide';
import { forkJoin, catchError, of } from 'rxjs';
import { LessonService } from '../../../core/services/lesson.service';
import type { Lesson, LessonLeaderboardEntry } from '../../../core/models';

@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './lesson-list.component.html',
  styleUrls: ['./lesson-list.component.css'],
  viewProviders: [
    provideIcons({
      lucideBookOpen, lucideClock, lucideArrowRight, lucideTrendingUp, lucideWallet,
      lucidePieChart, lucideRefreshCw, lucideCheckCircle, lucideAward, lucideMedal, lucideTrophy, lucideX, lucideInfo,
    })
  ]
})
export class LessonListComponent implements OnInit {
  private lessonService = inject(LessonService);

  lessons = signal<Lesson[]>([]);
  completedIds = signal<Set<string>>(new Set());
  leaderboard = signal<LessonLeaderboardEntry[]>([]);
  leaderboardModalOpen = signal(false);
  isLoading = signal<boolean>(true);
  loadError = signal<boolean>(false);

  completedCount = computed(() => {
    const ids = this.completedIds();
    return this.lessons().filter(l => ids.has(l.id)).length;
  });

  totalLessons = computed(() => this.lessons().length);

  completionPct = computed(() => {
    const total = this.totalLessons();
    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  ngOnInit(): void {
    this.load();
  }

  openLeaderboardModal(): void {
    this.leaderboardModalOpen.set(true);
  }

  closeLeaderboardModal(): void {
    this.leaderboardModalOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.leaderboardModalOpen()) {
      this.closeLeaderboardModal();
    }
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    forkJoin({
      lessons: this.lessonService.getLessons().pipe(catchError(() => of({ data: [] as Lesson[] }))),
      progress: this.lessonService.getProgress().pipe(catchError(() => of({ data: [] }))),
      leaderboard: this.lessonService.getLeaderboard().pipe(
        catchError(() => of({ data: [] as LessonLeaderboardEntry[] })),
      ),
    }).subscribe({
      next: ({ lessons, progress, leaderboard }) => {
        this.lessons.set(lessons.data ?? []);
        const ids = new Set<string>((progress.data ?? []).map((p: any) => p.lessonId));
        this.completedIds.set(ids);
        this.leaderboard.set(leaderboard.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  isCompleted(lessonId: string): boolean {
    return this.completedIds().has(lessonId);
  }

  getReadTime(lesson: Lesson): number {
    return lesson.readTimeMinutes ?? lesson.durationMinutes ?? 5;
  }

  getIconForCategory(category: string | undefined): string {
    const c = category?.trim();
    if (!c) return 'lucidePieChart';
    switch (c.toLowerCase()) {
      case 'investing': return 'lucideTrendingUp';
      case 'personal finance': return 'lucideWallet';
      default: return 'lucidePieChart';
    }
  }

  getRankIcon(rank: number): string {
    if (rank === 1) return 'lucideTrophy';
    if (rank === 2) return 'lucideMedal';
    return 'lucideAward';
  }
}

import { Component, OnInit, OnDestroy, HostListener, ViewEncapsulation, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft, lucideClock, lucideCalendar, lucideShare2, lucideCheckCircle,
  lucideLightbulb, lucideBrain, lucideZap, lucideChevronRight, lucideChevronLeft,
  lucideChevronUp, lucideChevronDown, lucideList,
  lucideTrophy, lucideBookOpen, lucideHelpCircle, lucideStar
} from '@ng-icons/lucide';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LessonService } from '../../../core/services/lesson.service';
import type { Lesson, LessonQuizQuestion } from '../../../core/models';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './lesson-view.component.html',
  styleUrls: ['./lesson-view.component.css'],
  encapsulation: ViewEncapsulation.None,
  viewProviders: [
    provideIcons({
      lucideArrowLeft, lucideClock, lucideCalendar, lucideShare2, lucideCheckCircle,
      lucideLightbulb, lucideBrain, lucideZap, lucideChevronRight, lucideChevronLeft,
      lucideChevronUp, lucideChevronDown, lucideList,
      lucideTrophy, lucideBookOpen, lucideHelpCircle, lucideStar
    })
  ]
})
export class LessonViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private lessonService = inject(LessonService);
  private platformId = inject(PLATFORM_ID);

  lesson = signal<Lesson | undefined>(undefined);
  parsedContent = signal<SafeHtml>('');
  isLoading = signal<boolean>(true);
  isCompleted = signal<boolean>(false);
  markingComplete = signal<boolean>(false);

  // Reading progress
  readingProgress = signal(0);

  // Fun facts
  facts: string[] = [];
  currentFactIndex = signal(0);
  private factInterval: ReturnType<typeof setInterval> | null = null;

  // Quiz
  quiz: QuizQuestion[] = [];
  currentQuestion = signal(0);
  selectedAnswer = signal<number | null>(null);
  answeredQuestions = signal<Record<number, number>>({});
  quizSubmitted = signal(false);
  quizScore = computed(() => {
    const answers = this.answeredQuestions();
    return this.quiz.filter((q, i) => answers[i] === q.correct).length;
  });

  private readonly quizData: Record<string, QuizQuestion[]> = {
    'Personal Finance': [
      {
        question: 'What is the "50/30/20" budgeting rule?',
        options: ['50% savings, 30% wants, 20% needs', '50% needs, 30% wants, 20% savings', '50% wants, 30% needs, 20% savings', '50% income, 30% tax, 20% expenses'],
        correct: 1,
        explanation: 'The 50/30/20 rule allocates 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.'
      },
      {
        question: 'Which of these is considered an "emergency fund" target?',
        options: ['1 month of expenses', '2 months of expenses', '3–6 months of expenses', '12 months of expenses'],
        correct: 2,
        explanation: 'Most financial experts recommend saving 3–6 months of living expenses as an emergency fund.'
      },
      {
        question: 'What does "net worth" mean?',
        options: ['Your total income', 'Your savings minus debt', 'Your assets minus your liabilities', 'Your salary after tax'],
        correct: 2,
        explanation: 'Net worth = total assets (what you own) minus total liabilities (what you owe).'
      }
    ],
    'Investing': [
      {
        question: 'What is compound interest?',
        options: ['Interest earned only on the principal', 'Interest earned on principal and accumulated interest', 'A fixed monthly fee', 'Interest charged on late payments'],
        correct: 1,
        explanation: 'Compound interest earns interest on both the original principal AND on interest already earned — this is how wealth grows exponentially over time.'
      },
      {
        question: 'What does "diversification" mean in investing?',
        options: ['Putting all money in one asset', 'Spreading investments across different assets', 'Only investing in stocks', 'Changing investments every month'],
        correct: 1,
        explanation: 'Diversification spreads risk across multiple assets — if one investment drops, others may not, protecting your overall portfolio.'
      },
      {
        question: 'What is a "bull market"?',
        options: ['A market that is falling', 'A market with high volatility', 'A market that is rising', 'A market with low trading volume'],
        correct: 2,
        explanation: 'A bull market describes a financial market that is rising or is expected to rise — the opposite of a bear market.'
      }
    ],
    'Budgeting': [
      {
        question: 'What is "zero-based budgeting"?',
        options: ['Having zero savings', 'Allocating every shilling of income to a category', 'Starting from last month\'s budget', 'Spending nothing on wants'],
        correct: 1,
        explanation: 'Zero-based budgeting means every shilling of income is assigned a purpose — income minus all allocations equals zero.'
      },
      {
        question: 'Which is a "fixed expense"?',
        options: ['Groceries', 'Entertainment', 'Rent', 'Fuel'],
        correct: 2,
        explanation: 'Fixed expenses like rent stay the same each month, making them predictable and easy to budget for.'
      },
      {
        question: 'What is the purpose of a "sinking fund"?',
        options: ['Emergency savings', 'Saving gradually for a known future expense', 'Debt repayment', 'Investment fund'],
        correct: 1,
        explanation: 'A sinking fund is money set aside gradually for a planned future expense (e.g., holiday, new phone) so you don\'t have to scramble when it arrives.'
      }
    ],
    'Savings': [
      {
        question: 'What is a "SACCO" in Kenya?',
        options: ['A type of bank loan', 'A mobile money service', 'A savings and credit cooperative', 'A government savings bond'],
        correct: 2,
        explanation: 'A SACCO (Savings and Credit Co-operative) is a member-owned financial cooperative that offers savings accounts and low-interest loans.'
      },
      {
        question: 'What is the "pay yourself first" strategy?',
        options: ['Spending on yourself before bills', 'Saving before spending on anything else', 'Paying off debt before saving', 'Investing your full salary'],
        correct: 1,
        explanation: '"Pay yourself first" means automatically transferring a set amount to savings the moment you receive income — before any other spending.'
      },
      {
        question: 'Which has the best interest rate typically?',
        options: ['Savings account', 'Current account', 'Fixed deposit', 'Under the mattress'],
        correct: 2,
        explanation: 'Fixed deposits (or term deposits) lock your money for a set period in exchange for a higher guaranteed interest rate than regular savings accounts.'
      }
    ]
  };

  // TOC
  tocItems = signal<TocItem[]>([]);
  activeSectionId = signal<string>('');
  tocExpanded = signal<boolean>(false);

  shareStatus = signal<'idle' | 'copied' | 'shared'>('idle');

  private readonly factsData: Record<string, string[]> = {
    'Personal Finance': [
      'The average Kenyan household saves only 5% of income. Bumping this to 20% for 5 years can build a KES 500k+ emergency fund.',
      'People who write down their financial goals are 42% more likely to achieve them.',
      'M-Pesa processes over 1 billion transactions a month — more than most African banks combined.',
      'Kenya has one of the highest mobile money adoption rates in the world at over 75%.'
    ],
    'Investing': [
      'KES 10,000 invested in the Nairobi Securities Exchange in 2010 would be worth approximately KES 60,000+ today.',
      'Time in the market beats timing the market — staying invested for 10 years outperforms almost any short-term strategy.',
      'Kenya\'s stock market (NSE) has over 60 listed companies and has returned an average of ~12% per year historically.',
      'Warren Buffett made 90% of his wealth after age 65 — the power of compounding needs time.'
    ],
    'Budgeting': [
      'People who budget feel 46% less financial stress than those who don\'t, even at the same income level.',
      'Impulse purchases account for an average of 40% of unplanned spending — budgeting dramatically reduces this.',
      'Writing down purchases (even mentally) reduces spending by up to 30% compared to contactless payment.',
      'The average person overestimates their willpower by 40% — hence why automatic savings beat manual ones.'
    ],
    'Savings': [
      'Kenyans in SACCOs earn an average dividend of 8–15% on shares annually, beating many bank rates.',
      'Starting to save KES 500/week at age 22 vs. KES 1,000/week at age 32 yields more money at 60 due to compounding.',
      'M-Shwari, M-Pesa\'s savings product, has over 30 million accounts — one of Kenya\'s most used financial tools.',
      'The "latte factor" — cutting one KES 500 daily coffee = KES 182,500 per year saved.'
    ]
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.lessonService.getLesson(id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const data = response.data;
            this.lesson.set(data);
            const body = data.body ?? data.content;
            if (body) this.parseMarkdown(body);
            this.loadCategoryContent(data.category);
            const canonicalId = data.id ?? id;
            this.lessonService.getProgress().subscribe({
              next: (res) => {
                const progress: { lessonId: string }[] = res?.data ?? [];
                this.isCompleted.set(progress.some((p) => p.lessonId === canonicalId));
              },
              error: () => { /* non-critical */ },
            });
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

  ngOnDestroy(): void {
    if (this.factInterval) clearInterval(this.factInterval);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const article = document.querySelector('.lesson-article') as HTMLElement | null;
    if (!article) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrolled = Math.max(0, scrollTop - articleTop);
    const total = Math.max(1, articleHeight - viewportHeight);
    this.readingProgress.set(Math.min(100, Math.round((scrolled / total) * 100)));
    this.updateActiveTocSection(scrollTop);
  }

  private updateActiveTocSection(scrollTop: number): void {
    const items = this.tocItems();
    if (items.length === 0) return;
    let activeId = items[0].id;
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el && el.offsetTop - 120 <= scrollTop) {
        activeId = item.id;
      }
    }
    this.activeSectionId.set(activeId);
  }

  scrollToSection(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.tocExpanded.set(false); // collapse on mobile after click
  }

  private loadCategoryContent(category: string | undefined): void {
    const cat = category?.trim() ?? '';
    const key = this.findKey(cat);
    this.facts = this.factsData[key] ?? this.factsData['Personal Finance'];
    const lessonQuiz = this.lesson()?.quiz;
    const raw =
      lessonQuiz && lessonQuiz.length > 0
        ? lessonQuiz
        : (this.quizData[key] ?? this.quizData['Personal Finance']);
    this.quiz = this.normalizeQuizQuestions(raw);
    this.currentQuestion.set(0);
    this.selectedAnswer.set(null);
    this.answeredQuestions.set({});
    this.quizSubmitted.set(false);
    this.startFactRotation();
  }

  /**
   * API / `lessons.json` use `correctIndex`; built-in fallbacks use `correct`.
   * Ensures `correct` is a valid option index so scoring and UI match user picks.
   */
  private normalizeQuizQuestions(
    raw: LessonQuizQuestion[] | QuizQuestion[],
  ): QuizQuestion[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const out: QuizQuestion[] = [];
    for (const item of raw) {
      const row = item as LessonQuizQuestion & { correct?: number; correctIndex?: number };
      const options = Array.isArray(row.options)
        ? row.options.map((o) => String(o))
        : [];
      const question = String(row.question ?? '').trim();
      let correct: number | undefined =
        typeof row.correct === 'number' ? row.correct : undefined;
      if (correct === undefined && typeof row.correctIndex === 'number') {
        correct = row.correctIndex;
      }
      if (!question || options.length === 0) continue;
      if (
        correct === undefined ||
        correct < 0 ||
        correct >= options.length ||
        !Number.isInteger(correct)
      ) {
        console.warn('[LessonView] Skipping invalid quiz row:', question);
        continue;
      }
      out.push({
        question,
        options,
        correct,
        explanation: String(row.explanation ?? ''),
      });
    }
    return out;
  }

  private findKey(category: string): string {
    const keys = Object.keys(this.quizData);
    const lower = category.toLowerCase();
    return keys.find(k => k.toLowerCase() === lower)
      ?? keys.find(k => lower.includes(k.toLowerCase()))
      ?? 'Personal Finance';
  }

  private startFactRotation(): void {
    if (this.factInterval) clearInterval(this.factInterval);
    this.factInterval = setInterval(() => {
      this.currentFactIndex.set((this.currentFactIndex() + 1) % this.facts.length);
    }, 7000);
  }

  nextFact(): void {
    this.currentFactIndex.set((this.currentFactIndex() + 1) % this.facts.length);
  }

  prevFact(): void {
    const len = this.facts.length;
    this.currentFactIndex.set((this.currentFactIndex() - 1 + len) % len);
  }

  selectAnswer(index: number): void {
    if (this.answeredQuestions()[this.currentQuestion()] !== undefined) return;
    this.selectedAnswer.set(index);
  }

  confirmAnswer(): void {
    const qi = this.currentQuestion();
    const sel = this.selectedAnswer();
    if (sel === null || this.answeredQuestions()[qi] !== undefined) return;
    this.answeredQuestions.update(a => ({ ...a, [qi]: sel }));
  }

  nextQuestion(): void {
    if (this.currentQuestion() < this.quiz.length - 1) {
      this.currentQuestion.update(q => q + 1);
      this.selectedAnswer.set(null);
    } else {
      this.quizSubmitted.set(true);
    }
  }

  isAnswered(qi: number): boolean {
    return this.answeredQuestions()[qi] !== undefined;
  }

  isCorrect(qi: number): boolean {
    return this.answeredQuestions()[qi] === this.quiz[qi]?.correct;
  }

  markComplete(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.isCompleted() || this.markingComplete()) return;
    this.markingComplete.set(true);
    const quizPayload = this.quiz.length > 0
      ? { correctAnswers: this.quizScore(), totalQuestions: this.quiz.length }
      : undefined;
    this.lessonService.markComplete(id, quizPayload).subscribe({
      next: () => {
        this.isCompleted.set(true);
        this.markingComplete.set(false);
      },
      error: () => { this.markingComplete.set(false); }
    });
  }

  retakeQuiz(): void {
    this.currentQuestion.set(0);
    this.selectedAnswer.set(null);
    this.answeredQuestions.set({});
    this.quizSubmitted.set(false);
  }

  async shareLesson(): Promise<void> {
    const l = this.lesson();
    const title = l?.title ?? 'Financial Lesson';
    const text = `Check out this lesson on FinAnalytics: "${title}"`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        this.shareStatus.set('shared');
        setTimeout(() => this.shareStatus.set('idle'), 2500);
      } catch { /* user cancelled — no action needed */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        this.shareStatus.set('copied');
        setTimeout(() => this.shareStatus.set('idle'), 2500);
      } catch { /* clipboard blocked */ }
    }
  }

  async parseMarkdown(content: string) {
    const toc = this.extractToc(content);
    this.tocItems.set(toc);
    if (toc.length > 0) this.activeSectionId.set(toc[0].id);
    const rawHtml = await marked.parse(content);
    const htmlWithIds = this.injectHeadingIds(rawHtml, toc);
    this.parsedContent.set(this.sanitizer.bypassSecurityTrustHtml(htmlWithIds));
  }

  private extractToc(markdown: string): TocItem[] {
    const regex = /^(#{2,3})\s+(.+)$/gm;
    const items: TocItem[] = [];
    const seen = new Map<string, number>();
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const baseId = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      const count = seen.get(baseId) ?? 0;
      const id = count === 0 ? baseId : `${baseId}-${count}`;
      seen.set(baseId, count + 1);
      items.push({ id, text, level });
    }
    return items;
  }

  private injectHeadingIds(html: string, toc: TocItem[]): string {
    let result = html;
    for (const item of toc) {
      const tag = `h${item.level}`;
      // Replace <h2>Text</h2> with <h2 id="...">Text</h2>
      const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(`<${tag}>([\\s\\S]*?${escaped}[\\s\\S]*?)</${tag}>`, 'm'),
        `<${tag} id="${item.id}">$1</${tag}>`
      );
    }
    return result;
  }
}

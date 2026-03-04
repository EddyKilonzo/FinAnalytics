import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTag,
  lucideSearch,
  lucideRefreshCw,
  lucideShoppingCart,
  lucideHome,
  lucideCar,
  lucideBriefcase,
  lucideActivity,
  lucideBookOpen,
  lucideMonitor,
  lucideCoffee,
  lucideHeart,
  lucideShoppingBag,
  lucideZap,
  lucidePlane,
  lucidePiggyBank,
  lucideWifi,
  lucideMoreHorizontal,
} from '@ng-icons/lucide';
import { CategoryService } from '../../core/services/category.service';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideTag, lucideSearch, lucideRefreshCw,
      lucideShoppingCart, lucideHome, lucideCar,
      lucideBriefcase, lucideActivity, lucideBookOpen,
      lucideMonitor, lucideCoffee, lucideHeart,
      lucideShoppingBag, lucideZap, lucidePlane,
      lucidePiggyBank, lucideWifi, lucideMoreHorizontal,
    }),
  ],
  template: `
    <div class="categories-page max-w-5xl mx-auto p-4 md:p-8">
      <!-- Header -->
      <header class="flex flex-col md:flex-row md:items-end gap-6 mb-10">
        <div>
          <h1 class="text-4xl font-extrabold tracking-tight text-white">Categories</h1>
          <p class="text-white/60 mt-2 text-lg">All spending and income categories.</p>
        </div>
        <!-- Search -->
        <div class="relative ml-auto w-full md:w-72">
          <ng-icon name="lucideSearch" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"></ng-icon>
          <input
            type="text"
            placeholder="Search categories…"
            class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
          />
        </div>
      </header>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center items-center py-24">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="flex flex-col items-center gap-3 py-24 text-center">
          <p class="text-white/50">Failed to load categories.</p>
          <button
            (click)="load()"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-medium transition-colors"
          >
            <ng-icon name="lucideRefreshCw" size="14"></ng-icon>
            Retry
          </button>
        </div>
      }

      <!-- Grid -->
      @if (!loading() && !error()) {
        @if (filtered().length === 0) {
          <div class="text-center py-24 text-white/40">
            No categories match "{{ searchQuery() }}"
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            @for (cat of filtered(); track cat.id) {
              <div
                class="category-card group flex items-start gap-4 p-5 rounded-2xl bg-white border-2 hover:shadow-md transition-all duration-200 cursor-default"
                [style.border-color]="cat.color || '#22c55e'"
              >
                <div
                  class="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white border-2"
                  [style.border-color]="cat.color || '#22c55e'"
                  [style.color]="cat.color || '#22c55e'"
                >
                  <ng-icon [name]="getIcon(cat.slug)" size="20"></ng-icon>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-800 text-sm leading-tight">{{ cat.name }}</p>
                  @if (cat.description) {
                    <p class="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">{{ cat.description }}</p>
                  }
                </div>
              </div>
            }
          </div>
          <p class="text-center text-white/25 text-xs mt-8">{{ filtered().length }} categories</p>
        }
      }
    </div>
  `,
  styles: [`
    .category-card {
      backdrop-filter: blur(8px);
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `],
})
export class CategoryListComponent implements OnInit {
  private categoryService = inject(CategoryService);

  loading = signal(true);
  error = signal(false);
  categories = signal<Category[]>([]);
  searchQuery = signal('');

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        const data: Category[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getIcon(slug: string): string {
    const map: Record<string, string> = {
      'food': 'lucideCoffee',
      'food-dining': 'lucideCoffee',
      'groceries': 'lucideShoppingCart',
      'transport': 'lucideCar',
      'housing': 'lucideHome',
      'rent': 'lucideHome',
      'utilities': 'lucideZap',
      'electricity': 'lucideZap',
      'internet': 'lucideWifi',
      'health': 'lucideHeart',
      'entertainment': 'lucideMonitor',
      'education': 'lucideBookOpen',
      'salary': 'lucideBriefcase',
      'income': 'lucideBriefcase',
      'shopping': 'lucideShoppingBag',
      'travel': 'lucidePlane',
      'savings': 'lucidePiggyBank',
      'fitness': 'lucideActivity',
    };
    const lower = slug.toLowerCase();
    for (const key of Object.keys(map)) {
      if (lower.includes(key)) return map[key];
    }
    return 'lucideTag';
  }
}

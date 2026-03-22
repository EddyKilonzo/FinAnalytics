import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideEdit2,
  lucideTrash2,
  lucideSearch,
  lucideX,
  lucideRefreshCw,
  lucideTag,
  lucideUtensils,
  lucideShoppingCart,
  lucideHome,
  lucideCar,
  lucideZap,
  lucideGraduationCap,
  lucideMonitor,
  lucideHeart,
  lucideBanknote,
  lucideShirt,
  lucidePiggyBank,
  lucideUsers,
  lucideLayers,
  lucideWifi,
  lucideBriefcase,
  lucidePlane,
  lucideShoppingBag,
  lucideActivity,
  lucideBookOpen,
  lucideCoffee,
} from '@ng-icons/lucide';
import { CategoryService } from '../../../core/services/category.service';
import type { Category } from '../../../core/models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEdit2,
      lucideTrash2,
      lucideSearch,
      lucideX,
      lucideRefreshCw,
      lucideTag,
      lucideUtensils,
      lucideShoppingCart,
      lucideHome,
      lucideCar,
      lucideZap,
      lucideGraduationCap,
      lucideMonitor,
      lucideHeart,
      lucideBanknote,
      lucideShirt,
      lucidePiggyBank,
      lucideUsers,
      lucideLayers,
      lucideWifi,
      lucideBriefcase,
      lucidePlane,
      lucideShoppingBag,
      lucideActivity,
      lucideBookOpen,
      lucideCoffee,
    })
  ],
  template: `
    <div class="admin-container fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Category Management</h1>
          <p class="admin-subtitle">Create, edit, and delete spending categories</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <ng-icon name="lucidePlus"></ng-icon> New Category
        </button>
      </div>

      <div class="fin-card-elevated slide-up categories-shell">
        <div class="categories-toolbar">
          <div class="search-bar">
            <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
            <input
              type="text"
              placeholder="Search categories..."
              class="search-input"
              [(ngModel)]="searchQuery"
            >
          </div>
          @if (!loading() && !loadError()) {
            <p class="toolbar-meta">{{ filtered().length }} categor{{ filtered().length === 1 ? 'y' : 'ies' }}</p>
          }
        </div>

        <div class="categories-body">
          @if (loading()) {
            <div class="state-block state-muted">
              <p>Loading categories…</p>
            </div>
          }

          @if (loadError()) {
            <div class="state-block">
              <p class="state-error">Failed to load categories.</p>
              <button type="button" class="btn-secondary" (click)="fetchCategories()">
                <ng-icon name="lucideRefreshCw"></ng-icon> Retry
              </button>
            </div>
          }

          @if (!loading() && !loadError()) {
            @if (filtered().length === 0) {
              <div class="state-block state-muted">
                <p>{{ categories().length === 0 ? 'No categories yet. Create one to get started.' : 'No categories match your search.' }}</p>
              </div>
            } @else {
              <div class="categories-grid">
                @for (cat of filtered(); track cat.id) {
                  <article
                    class="category-card"
                    [style.--cat-color]="cat.color || '#22c55e'"
                  >
                    <div class="category-card-top">
                      <div
                        class="category-icon-wrap"
                        [style.border-color]="cat.color || '#22c55e'"
                        [style.color]="cat.color || '#22c55e'"
                      >
                        <ng-icon [name]="getCategoryIcon(cat)" size="22"></ng-icon>
                      </div>
                      <h2 class="category-title">{{ cat.name }}</h2>
                    </div>
                    <code class="slug-badge">{{ cat.slug }}</code>
                    <p class="category-desc">{{ cat.description || 'No description yet.' }}</p>
                    <div class="category-card-actions">
                      <button type="button" class="btn-card-action" title="Edit" (click)="openEdit(cat)">
                        <ng-icon name="lucideEdit2" size="18"></ng-icon>
                        <span>Edit</span>
                      </button>
                      <button type="button" class="btn-card-action danger" title="Delete" (click)="openDelete(cat)">
                        <ng-icon name="lucideTrash2" size="18"></ng-icon>
                        <span>Delete</span>
                      </button>
                    </div>
                  </article>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>

    <!-- ── Create / Edit Modal ──────────────────────────────── -->
    @if (formModal) {
    <div class="modal-overlay" (click)="closeForm()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">{{ formModal === 'create' ? 'New Category' : 'Edit Category' }}</h2>
          <button class="btn-icon" (click)="closeForm()"><ng-icon name="lucideX"></ng-icon></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input type="text" class="form-input" [(ngModel)]="formName" placeholder="e.g. Social">
          </div>
          <div class="form-group">
            <label class="form-label">Slug *</label>
            <input type="text" class="form-input" [(ngModel)]="formSlug" placeholder="e.g. social" (input)="slugEdited = true">
            <p class="form-hint">Lowercase letters and hyphens only. Must be unique.</p>
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-row">
              <input type="color" class="color-picker" [(ngModel)]="formColor">
              <input type="text" class="form-input" [(ngModel)]="formColor" placeholder="#22c55e" style="flex:1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" [(ngModel)]="formDescription" rows="2" placeholder="Optional description"></textarea>
          </div>
          @if (formError) {
            <div class="modal-error">{{ formError }}</div>
          }
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeForm()">Cancel</button>
          <button class="btn-primary" (click)="saveForm()" [disabled]="formSaving">
            {{ formSaving ? 'Saving…' : (formModal === 'create' ? 'Create' : 'Save Changes') }}
          </button>
        </div>
      </div>
    </div>
    }

    <!-- ── Delete Confirm Modal ─────────────────────────────── -->
    @if (deletingCat) {
    <div class="modal-overlay" (click)="closeDelete()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Delete Category</h2>
          <button class="btn-icon" (click)="closeDelete()"><ng-icon name="lucideX"></ng-icon></button>
        </div>
        <div class="modal-body">
          <p style="margin: 0 0 0.5rem 0;">
            Delete <strong>{{ deletingCat.name }}</strong> (<code>{{ deletingCat.slug }}</code>)?
          </p>
          <p style="color: #d97706; font-size: 0.9rem; margin: 0;">
            Transactions referencing this category will have their category cleared.
          </p>
          @if (deleteError) {
            <div class="modal-error">{{ deleteError }}</div>
          }
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeDelete()">Cancel</button>
          <button class="btn-danger" (click)="confirmDelete()" [disabled]="deleteSaving">
            {{ deleteSaving ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .admin-container { padding: 2.5rem; max-width: 1400px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .admin-title { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0; letter-spacing: -0.03em; }
    .admin-subtitle { margin: 0; font-size: 1.1rem; color: #a3c4ad !important; }
    .btn-primary, .btn-secondary, .btn-danger {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-size: 0.95rem; border: none;
    }
    .btn-primary { background: var(--accent, #22c55e); color: #fff; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--surface-alt, #f3f4f6); color: var(--text-primary, #111827); }
    .btn-secondary:hover { background: var(--surface-hover, #e5e7eb); }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .fin-card-elevated {
      background: var(--card-bg, #fff); border-radius: 24px; padding: 0; overflow: hidden;
      box-shadow: rgba(50,50,93,0.25) 0px 50px 100px -20px, rgba(0,0,0,0.3) 0px 30px 60px -30px, rgba(10,37,64,0.35) 0px -2px 6px 0px inset;
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
    }
    .categories-shell { display: flex; flex-direction: column; }
    .categories-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1.35rem 1.75rem; border-bottom: 1px solid var(--border-light, #e5e7eb);
      background: var(--surface-light, #fafafa);
      /* Toolbar sits on a light strip while the app may use dark-theme semantic colors — use fixed contrast for inputs/labels */
      --toolbar-fg: #0f172a;
      --toolbar-muted: #64748b;
    }
    .search-bar { position: relative; flex: 1; min-width: 200px; max-width: 420px; }
    .toolbar-meta { margin: 0; font-size: 0.8125rem; font-weight: 600; color: var(--toolbar-muted); }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--toolbar-muted); }
    .search-input {
      width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 10px;
      border: 1px solid var(--border-medium, #d1d5db); background: #fff; font-size: 0.95rem;
      color: var(--toolbar-fg); transition: all 0.2s; box-sizing: border-box;
    }
    .search-input::placeholder { color: #94a3b8; opacity: 1; }
    .search-input:focus { outline: none; border-color: var(--accent, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
    .categories-body { padding: 1.5rem 1.75rem 1.75rem; }
    .state-block { text-align: center; padding: 3rem 1.5rem; }
    .state-muted { color: var(--text-muted); }
    .state-error { color: #dc2626; margin: 0 0 1rem 0; font-weight: 600; }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .category-card {
      --cat-color: #22c55e;
      display: flex; flex-direction: column; gap: 0.85rem;
      padding: 1.35rem 1.35rem 1.15rem;
      border-radius: 16px;
      background: var(--card-bg, #fff);
      border: 2px solid var(--border-subtle, rgba(0,0,0,0.06));
      border-left: 4px solid var(--cat-color);
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .category-card:hover {
      transform: translateY(-3px);
      box-shadow: rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;
    }
    .category-card-top { display: flex; align-items: flex-start; gap: 0.85rem; }
    .category-icon-wrap {
      flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: var(--card-bg, #fff); border: 2px solid var(--cat-color, #22c55e);
    }
    .category-title {
      margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);
      line-height: 1.35; letter-spacing: -0.02em;
      padding-top: 0.15rem;
    }
    .slug-badge {
      align-self: flex-start; font-size: 0.75rem; font-weight: 600;
      background: rgba(34,197,94,0.1); color: #15803d; padding: 0.3rem 0.55rem;
      border-radius: 8px; font-family: ui-monospace, monospace;
      border: 1px solid rgba(34,197,94,0.2);
    }
    .category-desc {
      margin: 0; flex: 1; font-size: 0.875rem; line-height: 1.55; color: var(--text-secondary);
      opacity: 0.92; min-height: 2.75rem;
    }
    .category-card-actions {
      display: flex; gap: 0.5rem; margin-top: 0.25rem; padding-top: 0.85rem;
      border-top: 1px solid var(--border-light, #e5e7eb);
    }
    .btn-card-action {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.55rem 0.75rem; border-radius: 10px; font-size: 0.8125rem; font-weight: 600;
      border: 2px solid var(--border-medium, #d1d5db); background: var(--card-bg, #fff);
      color: var(--text-primary); cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .btn-card-action:hover {
      background: var(--accent-dim, rgba(34,197,94,0.08));
      border-color: var(--accent, #22c55e);
      color: var(--accent, #22c55e);
    }
    .btn-card-action.danger:hover {
      background: rgba(239,68,68,0.08);
      border-color: #dc2626;
      color: #dc2626;
    }
    .text-muted { color: var(--text-muted, #9ca3af); }
    .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
    .btn-icon:hover { background: var(--surface-hover, #e5e7eb); color: var(--text-primary); }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-panel { background: var(--card-bg, #fff); border-radius: 20px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.75rem; border-bottom: 1px solid var(--border-light, #e5e7eb); }
    .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .modal-body { padding: 1.5rem 1.75rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.75rem; border-top: 1px solid var(--border-light, #e5e7eb); }
    .modal-error { color: #dc2626; font-size: 0.875rem; margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(220,38,38,0.08); border-radius: 8px; }
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
    .form-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0.3rem 0 0 0; }
    .form-input { width: 100%; padding: 0.65rem 0.9rem; border: 1px solid var(--border-medium, #d1d5db); border-radius: 10px; font-size: 0.95rem; background: var(--bg-primary, #fff); color: var(--text-primary); transition: border-color 0.2s; box-sizing: border-box; resize: vertical; }
    .form-input:focus { outline: none; border-color: var(--accent, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
    .color-row { display: flex; align-items: center; gap: 0.75rem; }
    .color-picker { width: 44px; height: 38px; border-radius: 8px; border: 1px solid var(--border-medium, #d1d5db); cursor: pointer; padding: 2px; background: var(--bg-primary, #fff); flex-shrink: 0; }
  `]
})
export class AdminCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);

  loading = signal(true);
  loadError = signal(false);
  categories = signal<Category[]>([]);
  searchQuery = '';

  // Form modal ('create' | 'edit' | null)
  formModal: 'create' | 'edit' | null = null;
  editingCat: Category | null = null;
  formName = '';
  formSlug = '';
  formColor = '#22c55e';
  formDescription = '';
  slugEdited = false;
  formSaving = false;
  formError = '';

  // Delete modal
  deletingCat: Category | null = null;
  deleteSaving = false;
  deleteError = '';

  filtered = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  });

  /** Lucide icon name from slug/name — white tile + category color border (theme-aligned). */
  getCategoryIcon(cat: Category): string {
    const slug = (cat.slug || '').toLowerCase().trim();
    if (slug === 'other') return 'lucideLayers';

    const raw = `${slug} ${(cat.name || '').toLowerCase()}`;
    const rules: readonly [string, string][] = [
      ['food-dining', 'lucideUtensils'],
      ['groceries', 'lucideShoppingCart'],
      ['food', 'lucideUtensils'],
      ['coffee', 'lucideCoffee'],
      ['restaurant', 'lucideUtensils'],
      ['rent-housing', 'lucideHome'],
      ['rent', 'lucideHome'],
      ['housing', 'lucideHome'],
      ['utilities', 'lucideZap'],
      ['electricity', 'lucideZap'],
      ['internet', 'lucideWifi'],
      ['water', 'lucideZap'],
      ['transport', 'lucideCar'],
      ['travel', 'lucidePlane'],
      ['education', 'lucideGraduationCap'],
      ['tuition', 'lucideBookOpen'],
      ['book', 'lucideBookOpen'],
      ['entertainment', 'lucideMonitor'],
      ['stream', 'lucideMonitor'],
      ['gaming', 'lucideMonitor'],
      ['health', 'lucideHeart'],
      ['gym', 'lucideActivity'],
      ['medical', 'lucideHeart'],
      ['income', 'lucideBanknote'],
      ['salary', 'lucideBriefcase'],
      ['clothing', 'lucideShirt'],
      ['clothes', 'lucideShirt'],
      ['shopping', 'lucideShoppingBag'],
      ['savings', 'lucidePiggyBank'],
      ['social', 'lucideUsers'],
      ['gift', 'lucideUsers'],
    ];
    for (const [key, icon] of rules) {
      if (raw.includes(key)) return icon;
    }
    return 'lucideTag';
  }

  ngOnInit() {
    this.fetchCategories();
  }

  fetchCategories() {
    this.loading.set(true);
    this.loadError.set(false);
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  openCreate() {
    this.formModal = 'create';
    this.editingCat = null;
    this.formName = '';
    this.formSlug = '';
    this.formColor = '#22c55e';
    this.formDescription = '';
    this.slugEdited = false;
    this.formError = '';
  }

  openEdit(cat: Category) {
    this.formModal = 'edit';
    this.editingCat = cat;
    this.formName = cat.name;
    this.formSlug = cat.slug;
    this.formColor = cat.color ?? '#22c55e';
    this.formDescription = cat.description ?? '';
    this.slugEdited = true;
    this.formError = '';
  }

  closeForm() {
    this.formModal = null;
  }

  onNameInput() {
    if (!this.slugEdited) {
      this.formSlug = this.formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  }

  saveForm() {
    if (!this.formName.trim()) { this.formError = 'Name is required.'; return; }
    if (!this.formSlug.trim()) { this.formError = 'Slug is required.'; return; }
    this.formSaving = true;
    this.formError = '';

    const body = {
      name: this.formName.trim(),
      slug: this.formSlug.trim(),
      color: this.formColor || undefined,
      description: this.formDescription.trim() || undefined,
    };

    const req$ = this.formModal === 'create'
      ? this.categoryService.createCategory(body)
      : this.categoryService.updateCategory(this.editingCat!.id, body);

    req$.subscribe({
      next: (res) => {
        if (this.formModal === 'create') {
          this.categories.update(cats => [...cats, res.data]);
        } else {
          this.categories.update(cats => cats.map(c => c.id === res.data.id ? res.data : c));
        }
        this.formSaving = false;
        this.formModal = null;
      },
      error: (err) => {
        this.formError = err?.error?.message ?? 'Failed to save category.';
        this.formSaving = false;
      }
    });
  }

  openDelete(cat: Category) {
    this.deletingCat = cat;
    this.deleteError = '';
  }

  closeDelete() {
    this.deletingCat = null;
  }

  confirmDelete() {
    if (!this.deletingCat) return;
    this.deleteSaving = true;
    this.deleteError = '';
    this.categoryService.deleteCategory(this.deletingCat.id).subscribe({
      next: () => {
        this.categories.update(cats => cats.filter(c => c.id !== this.deletingCat!.id));
        this.deleteSaving = false;
        this.deletingCat = null;
      },
      error: (err) => {
        this.deleteError = err?.error?.message ?? 'Failed to delete category.';
        this.deleteSaving = false;
      }
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucidePlus,
  lucidePencil,
  lucideTrash2,
  lucideX,
  lucideCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideClock,
  lucideTag,
  lucideSparkles,
  lucideCheckCircle,
  lucideXCircle,
  lucideRefreshCw,
  lucideEye,
} from '@ng-icons/lucide';
import { LessonService } from '../../../core/services/lesson.service';
import type { Lesson } from '../../../core/models';

type ViewMode = 'list' | 'create' | 'edit';
type TabMode = 'published' | 'drafts';

@Component({
  selector: 'app-admin-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideBookOpen, lucidePlus, lucidePencil, lucideTrash2, lucideX, lucideCheck,
      lucideChevronDown, lucideChevronUp, lucideClock, lucideTag,
      lucideSparkles, lucideCheckCircle, lucideXCircle, lucideRefreshCw, lucideEye,
    }),
  ],
  template: `
    <div class="admin-container fade-in">
      <!-- Header -->
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Lesson Management</h1>
          <p class="admin-subtitle">Create, manage, and review AI-generated financial education content</p>
        </div>
        <div class="header-actions">
          <button *ngIf="tab() === 'drafts'" class="btn-generate" (click)="generateDraft()" [disabled]="isGenerating()">
            <ng-icon name="lucideSparkles" size="17"></ng-icon>
            {{ isGenerating() ? 'Generating...' : 'Generate Draft' }}
          </button>
          <button *ngIf="view() === 'list' && tab() === 'published'" class="btn-create" (click)="openCreate()">
            <ng-icon name="lucidePlus" size="18"></ng-icon>
            New Lesson
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div *ngIf="view() === 'list'" class="tabs">
        <button class="tab" [class.active]="tab() === 'published'" (click)="setTab('published')">
          <ng-icon name="lucideBookOpen" size="15"></ng-icon>
          Published ({{ lessons().length }})
        </button>
        <button class="tab" [class.active]="tab() === 'drafts'" (click)="setTab('drafts')">
          <ng-icon name="lucideSparkles" size="15"></ng-icon>
          AI Drafts
          <span *ngIf="pendingDrafts() > 0" class="tab-badge">{{ pendingDrafts() }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error()" class="error-banner">{{ error() }}</div>

      <!-- ── PUBLISHED LESSONS ──────────────────────────────────────── -->
      <ng-container *ngIf="!isLoading() && view() === 'list' && tab() === 'published'">
        <div class="lessons-grid">
          <div *ngIf="lessons().length === 0" class="empty-state fin-card-elevated">
            <ng-icon name="lucideBookOpen" size="40"></ng-icon>
            <p>No lessons yet. Create your first lesson.</p>
          </div>

          <div class="lesson-card fin-card-elevated" *ngFor="let lesson of lessons()">
            <div class="lesson-card-top">
              <div class="lesson-icon">
                <ng-icon name="lucideBookOpen" size="20"></ng-icon>
              </div>
              <div class="lesson-actions">
                <button class="btn-edit" (click)="openEdit(lesson)" title="Edit">
                  <ng-icon name="lucidePencil" size="16"></ng-icon>
                </button>
                <button class="btn-delete" (click)="confirmDelete(lesson)" title="Delete">
                  <ng-icon name="lucideTrash2" size="16"></ng-icon>
                </button>
              </div>
            </div>
            <h3 class="lesson-title">{{ lesson.title }}</h3>
            <p class="lesson-summary">{{ lesson.summary }}</p>
            <div class="lesson-meta">
              <span class="meta-chip">
                <ng-icon name="lucideClock" size="13"></ng-icon>
                {{ lesson.durationMinutes }} min
              </span>
              <span class="meta-chip" *ngFor="let topic of lesson.topics">
                <ng-icon name="lucideTag" size="13"></ng-icon>
                {{ topic }}
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ── AI DRAFTS ──────────────────────────────────────────────── -->
      <ng-container *ngIf="!isLoading() && view() === 'list' && tab() === 'drafts'">
        <div *ngIf="drafts().length === 0" class="empty-state fin-card-elevated">
          <ng-icon name="lucideSparkles" size="40"></ng-icon>
          <p>No AI drafts yet. Click "Generate Draft" to create one.</p>
        </div>

        <div class="drafts-list">
          <div class="draft-card fin-card-elevated" *ngFor="let draft of drafts()">
            <div class="draft-card-top">
              <div class="draft-status" [class]="'status-' + draft.status">
                {{ draft.status | titlecase }}
              </div>
              <span class="draft-date">{{ draft.generatedAt | date:'MMM d, y' }}</span>
            </div>
            <h3 class="draft-title">{{ draft.title }}</h3>
            <p class="draft-summary">{{ draft.summary }}</p>
            <div class="lesson-meta">
              <span class="meta-chip">
                <ng-icon name="lucideClock" size="13"></ng-icon>
                {{ draft.durationMinutes }} min
              </span>
              <span class="meta-chip" *ngFor="let t of draft.topics">
                <ng-icon name="lucideTag" size="13"></ng-icon>
                {{ t }}
              </span>
            </div>

            <!-- Preview toggle -->
            <div class="draft-preview-wrap" *ngIf="previewDraftId() === draft.id">
              <div class="draft-preview" [innerHTML]="renderDraftBody(draft.body)"></div>
            </div>

            <div class="draft-actions" *ngIf="draft.status === 'pending'">
              <button class="btn-preview" (click)="togglePreview(draft.id)" title="Preview">
                <ng-icon name="lucideEye" size="15"></ng-icon>
                {{ previewDraftId() === draft.id ? 'Hide' : 'Preview' }}
              </button>
              <button class="btn-approve" (click)="approveDraft(draft.id)" [disabled]="actionDraftId() === draft.id">
                <ng-icon name="lucideCheckCircle" size="15"></ng-icon>
                {{ actionDraftId() === draft.id ? 'Publishing...' : 'Approve & Publish' }}
              </button>
              <button class="btn-reject" (click)="rejectDraft(draft.id)" [disabled]="actionDraftId() === draft.id">
                <ng-icon name="lucideXCircle" size="15"></ng-icon>
                Reject
              </button>
            </div>
            <div class="draft-actions" *ngIf="draft.status !== 'pending'">
              <button class="btn-icon" (click)="deleteDraft(draft.id)" title="Delete draft">
                <ng-icon name="lucideTrash2" size="15"></ng-icon>
                Delete
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ── CREATE / EDIT FORM ──────────────────────────────────────── -->
      <div *ngIf="view() === 'create' || view() === 'edit'" class="form-card fin-card-elevated">
        <div class="form-header">
          <h2 class="form-title">{{ view() === 'create' ? 'New Lesson' : 'Edit Lesson' }}</h2>
          <button class="btn-icon" (click)="cancelForm()">
            <ng-icon name="lucideX" size="20"></ng-icon>
          </button>
        </div>

        <div class="form-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input class="form-input" [(ngModel)]="form.title" placeholder="e.g. Budgeting Basics" />
            </div>
            <div class="form-group">
              <label class="form-label">Slug *</label>
              <input class="form-input" [(ngModel)]="form.slug" placeholder="e.g. budgeting-basics" [disabled]="view() === 'edit'" />
              <span class="form-hint">URL-friendly identifier, cannot be changed after creation</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Duration (minutes) *</label>
              <input class="form-input" type="number" [(ngModel)]="form.durationMinutes" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Topics (comma-separated)</label>
              <input class="form-input" [(ngModel)]="topicsInput" placeholder="e.g. budgeting, finance, savings" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Summary *</label>
            <textarea class="form-input form-textarea" [(ngModel)]="form.summary" rows="2" placeholder="Short description shown on the lesson card"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Body (Markdown) *</label>
            <div class="editor-tabs">
              <button class="editor-tab" [class.active]="editorTab() === 'write'" (click)="editorTab.set('write')">Write</button>
              <button class="editor-tab" [class.active]="editorTab() === 'preview'" (click)="editorTab.set('preview')">Preview</button>
            </div>
            <textarea *ngIf="editorTab() === 'write'" class="form-input form-textarea markdown-editor" [(ngModel)]="form.body" rows="16" placeholder="Write lesson content in Markdown..."></textarea>
            <div *ngIf="editorTab() === 'preview'" class="markdown-preview" [innerHTML]="renderedBody()"></div>
          </div>
        </div>

        <div class="form-footer">
          <div *ngIf="formError()" class="form-error">{{ formError() }}</div>
          <div class="form-actions">
            <button class="btn-cancel" (click)="cancelForm()">Cancel</button>
            <button class="btn-save" (click)="saveLesson()" [disabled]="isSaving()">
              <ng-icon name="lucideCheck" size="16"></ng-icon>
              {{ isSaving() ? 'Saving...' : (view() === 'create' ? 'Create Lesson' : 'Save Changes') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── DELETE CONFIRM MODAL ──────────────────────────────────── -->
      <div *ngIf="deleteTarget()" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal fin-card-elevated" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Lesson</h3>
          <p class="modal-body">Are you sure you want to delete <strong>{{ deleteTarget()!.title }}</strong>? This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="cancelDelete()">Cancel</button>
            <button class="btn-delete-confirm" (click)="executeDelete()" [disabled]="isSaving()">
              {{ isSaving() ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .admin-title { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.4rem 0; letter-spacing: -0.02em; }
    .admin-subtitle { margin: 0; font-size: 1rem; color: #a3c4ad !important; }
    .header-actions { display: flex; gap: 0.65rem; }
    .btn-create { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-create:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-generate { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-generate:hover:not(:disabled) { background: rgba(139,92,246,0.25); }
    .btn-generate:disabled { opacity: 0.55; cursor: not-allowed; }
    /* Tabs */
    .tabs { display: flex; gap: 0.25rem; margin-bottom: 1.5rem; background: var(--surface-alt); padding: 0.25rem; border-radius: 12px; width: fit-content; }
    .tab { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; border-radius: 9px; border: none; background: transparent; color: var(--text-muted); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .tab.active { background: var(--surface-raised); color: var(--text-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .tab-badge { background: #a78bfa; color: #fff; border-radius: 100px; font-size: 0.7rem; padding: 0.05rem 0.45rem; font-weight: 700; }
    /* Loading */
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 4rem 2rem; color: var(--text-muted); }
    .spinner { border: 3px solid var(--border-subtle); border-top: 3px solid var(--accent); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-banner { padding: 1rem 1.5rem; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; color: #f87171; margin-bottom: 1.5rem; }
    .fin-card-elevated { background: var(--card-bg); border-radius: 20px; padding: 1.5rem; border: 1px solid var(--border-subtle); box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    /* Published lessons grid */
    .lessons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 1.25rem; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 2rem; color: var(--text-muted); text-align: center; grid-column: 1 / -1; }
    .lesson-card { display: flex; flex-direction: column; gap: 0.75rem; transition: transform 0.2s, box-shadow 0.2s; }
    .lesson-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.18); }
    .lesson-card-top { display: flex; align-items: center; justify-content: space-between; }
    .lesson-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.15); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lesson-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.35; }
    .lesson-summary { font-size: 0.875rem; color: var(--text-primary); opacity: 0.6; margin: 0; line-height: 1.5; flex: 1; }
    .draft-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.35; }
    .draft-summary { font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
    .lesson-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); }
    .meta-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 20px; background: var(--surface); color: var(--text-primary); opacity: 0.75; }
    .lesson-actions { display: flex; gap: 0.4rem; }
    .btn-edit { width: 34px; height: 34px; border-radius: 10px; background: rgba(99,102,241,0.12); color: #818cf8; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn-edit:hover { background: rgba(99,102,241,0.25); }
    .btn-delete { width: 34px; height: 34px; border-radius: 10px; background: rgba(239,68,68,0.1); color: #f87171; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn-delete:hover { background: rgba(239,68,68,0.2); }
    /* Drafts */
    .drafts-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .draft-card { display: flex; flex-direction: column; gap: 0.75rem; }
    .draft-card-top { display: flex; align-items: center; justify-content: space-between; }
    .draft-status { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.2rem 0.7rem; border-radius: 100px; }
    .status-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .status-approved { background: rgba(16,185,129,0.15); color: #10b981; }
    .status-rejected { background: rgba(239,68,68,0.12); color: #f87171; }
    .draft-date { font-size: 0.75rem; color: var(--text-muted); }
    .draft-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); }
    .btn-approve { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-approve:hover:not(:disabled) { background: rgba(16,185,129,0.3); }
    .btn-approve:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-reject { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
    .btn-reject:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-preview { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; background: var(--surface-alt); color: var(--text-secondary); border: 1px solid var(--border-subtle); border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-preview:hover { color: var(--accent); border-color: var(--accent); }
    .draft-preview-wrap { max-height: 400px; overflow-y: auto; }
    .draft-preview { padding: 1.25rem; background: var(--surface-alt); border-radius: 12px; color: var(--text-primary); font-size: 0.875rem; line-height: 1.7; }
    .draft-preview h1, .draft-preview h2, .draft-preview h3 { color: var(--text-primary); margin-top: 1rem; }
    .draft-preview span[style], .draft-preview font[style] { color: inherit !important; }
    .draft-preview code { background: var(--surface); padding: 0.1rem 0.35rem; border-radius: 4px; }
    /* Form */
    .form-card { }
    .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .form-title { font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .btn-icon { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.65rem; border-radius: 8px; background: var(--surface-alt); border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .btn-icon:hover { background: var(--border-subtle); color: var(--text-primary); }
    .form-body { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-label { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); opacity: 0.8; }
    .form-input { background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 0.65rem 0.9rem; color: var(--text-primary); font-size: 0.95rem; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; font-family: inherit; }
    .form-input:focus { border-color: var(--accent); }
    .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-textarea { resize: vertical; min-height: 60px; }
    .form-hint { font-size: 0.78rem; color: var(--text-muted); }
    .editor-tabs { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; }
    .editor-tab { padding: 0.35rem 0.9rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-muted); font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .editor-tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .markdown-editor { font-family: 'Courier New', monospace; font-size: 0.875rem; line-height: 1.6; }
    .markdown-preview { min-height: 300px; padding: 1rem; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; line-height: 1.7; overflow-y: auto; }
    .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { color: var(--text-primary); margin-top: 1.25rem; }
    .markdown-preview code { background: var(--surface-alt); padding: 0.1rem 0.35rem; border-radius: 4px; }
    .markdown-preview pre { background: var(--surface-alt); padding: 1rem; border-radius: 8px; overflow-x: auto; }
    .form-footer { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle); }
    .form-error { padding: 0.65rem 1rem; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; color: #f87171; font-size: 0.875rem; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.65rem 1.25rem; background: transparent; border: 1px solid var(--border-subtle); border-radius: 12px; color: var(--text-muted); font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-cancel:hover { background: var(--surface-alt); }
    .btn-save { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-save:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { max-width: 440px; width: 100%; }
    .modal-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.75rem 0; }
    .modal-body { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin: 0 0 1.5rem 0; }
    .modal-body strong { color: var(--text-primary); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-delete-confirm { padding: 0.65rem 1.25rem; background: rgba(239,68,68,0.85); border: none; border-radius: 12px; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-delete-confirm:hover:not(:disabled) { background: rgba(239,68,68,1); }
    .btn-delete-confirm:disabled { opacity: 0.55; cursor: not-allowed; }
  `]
})
export class AdminLessonsComponent implements OnInit {
  private lessonService = inject(LessonService);

  tab = signal<TabMode>('published');
  view = signal<ViewMode>('list');
  isLoading = signal(true);
  isSaving = signal(false);
  isGenerating = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editorTab = signal<'write' | 'preview'>('write');

  lessons = signal<Lesson[]>([]);
  drafts = signal<any[]>([]);
  deleteTarget = signal<Lesson | null>(null);
  editingId = signal<string | null>(null);
  previewDraftId = signal<string | null>(null);
  actionDraftId = signal<string | null>(null);

  pendingDrafts = () => this.drafts().filter(d => d.status === 'pending').length;

  topicsInput = '';
  form: Partial<Lesson> = {};

  ngOnInit() {
    this.loadLessons();
  }

  setTab(t: TabMode) {
    this.tab.set(t);
    if (t === 'drafts') this.loadDrafts();
  }

  private loadLessons() {
    this.isLoading.set(true);
    this.error.set(null);
    this.lessonService.getLessons().subscribe({
      next: (res) => {
        this.lessons.set((res.data ?? []) as Lesson[]);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load lessons.');
        this.isLoading.set(false);
      }
    });
  }

  private loadDrafts() {
    this.lessonService.getDrafts().subscribe({
      next: (res) => this.drafts.set(res.data ?? []),
      error: () => this.error.set('Failed to load AI drafts.')
    });
  }

  generateDraft() {
    this.isGenerating.set(true);
    this.error.set(null);
    this.lessonService.generateDraft().subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        if (res.data) this.drafts.update(d => [res.data, ...d]);
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.error.set(err?.error?.message ?? 'Generation failed. Make sure ANTHROPIC_API_KEY is configured.');
      }
    });
  }

  approveDraft(id: string) {
    this.actionDraftId.set(id);
    this.lessonService.approveDraft(id).subscribe({
      next: () => {
        this.actionDraftId.set(null);
        this.loadDrafts();
        this.loadLessons();
      },
      error: (err) => {
        this.actionDraftId.set(null);
        this.error.set(err?.error?.message ?? 'Failed to approve draft.');
      }
    });
  }

  rejectDraft(id: string) {
    this.actionDraftId.set(id);
    this.lessonService.rejectDraft(id).subscribe({
      next: () => { this.actionDraftId.set(null); this.loadDrafts(); },
      error: () => { this.actionDraftId.set(null); }
    });
  }

  deleteDraft(id: string) {
    this.lessonService.deleteDraft(id).subscribe({
      next: () => this.drafts.update(d => d.filter(x => x.id !== id)),
      error: () => {}
    });
  }

  togglePreview(id: string) {
    this.previewDraftId.set(this.previewDraftId() === id ? null : id);
  }

  renderDraftBody(body: string): string {
    return body
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hpc])(.+)$/gm, '<p>$1</p>');
  }

  renderedBody(): string {
    return this.renderDraftBody(this.form.body ?? '');
  }

  openCreate() {
    this.form = { title: '', slug: '', durationMinutes: 5, topics: [], summary: '', body: '' };
    this.topicsInput = '';
    this.editingId.set(null);
    this.formError.set(null);
    this.editorTab.set('write');
    this.view.set('create');
  }

  openEdit(lesson: Lesson) {
    this.form = { ...lesson };
    this.topicsInput = (lesson.topics ?? []).join(', ');
    this.editingId.set(lesson.id ?? lesson.slug ?? null);
    this.formError.set(null);
    this.editorTab.set('write');
    this.view.set('edit');
  }

  cancelForm() {
    this.view.set('list');
    this.form = {};
    this.formError.set(null);
  }

  saveLesson() {
    const { title, slug, durationMinutes, summary, body } = this.form;
    if (!title?.trim() || !slug?.trim() || !durationMinutes || !summary?.trim() || !body?.trim()) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    const payload: Partial<Lesson> = {
      ...this.form,
      topics: this.topicsInput.split(',').map(t => t.trim()).filter(Boolean),
    };
    this.isSaving.set(true);
    this.formError.set(null);
    const obs = this.view() === 'create'
      ? this.lessonService.createLesson(payload)
      : this.lessonService.updateLesson(this.editingId()!, payload);
    obs.subscribe({
      next: () => { this.isSaving.set(false); this.view.set('list'); this.loadLessons(); },
      error: (err) => { this.isSaving.set(false); this.formError.set(err?.error?.message ?? 'Failed to save lesson.'); }
    });
  }

  confirmDelete(lesson: Lesson) { this.deleteTarget.set(lesson); }
  cancelDelete() { this.deleteTarget.set(null); }

  executeDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.isSaving.set(true);
    this.lessonService.deleteLesson(target.id ?? target.slug ?? '').subscribe({
      next: () => { this.isSaving.set(false); this.deleteTarget.set(null); this.loadLessons(); },
      error: () => { this.isSaving.set(false); this.deleteTarget.set(null); this.error.set('Failed to delete lesson.'); }
    });
  }
}

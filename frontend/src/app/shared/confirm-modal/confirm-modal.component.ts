import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle } from '@ng-icons/lucide';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideAlertTriangle })],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/50 animate-fade-in" (click)="onBackdropClick()">
        <div class="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-slide-up" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="messageId">
          <div class="p-6">
            @if (danger) {
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 mx-auto">
                <ng-icon name="lucideAlertTriangle" size="24"></ng-icon>
              </div>
            }
            <h2 [id]="titleId" class="text-xl font-bold text-slate-800 text-center mb-2">{{ title }}</h2>
            <p [id]="messageId" class="text-slate-600 text-center mb-6">{{ message }}</p>
            <div class="flex gap-3 justify-end">
              <button type="button" (click)="cancel.emit()" class="px-4 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
                {{ cancelLabel }}
              </button>
              <button type="button" (click)="confirm.emit()" [class]="danger ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'" class="px-4 py-2.5 rounded-xl font-medium border transition-colors">
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: confirmFadeIn 0.2s ease-out;
    }
    .animate-slide-up {
      animation: confirmSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes confirmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes confirmSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;
  @Input() closeOnBackdrop = true;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get titleId(): string {
    return 'confirm-modal-title';
  }
  get messageId(): string {
    return 'confirm-modal-message';
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.cancel.emit();
    }
  }
}

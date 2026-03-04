import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, type Toast } from './toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideXCircle, lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideCheckCircle, lucideXCircle, lucideX })],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  private unsub: (() => void) | null = null;

  toasts: Toast[] = [];

  ngOnInit(): void {
    this.unsub = this.toastService.subscribe((t) => (this.toasts = t));
  }

  ngOnDestroy(): void {
    this.unsub?.();
  }

  close(id: string): void {
    this.toastService.remove(id);
  }

  trackById(_: number, t: Toast): string {
    return t.id;
  }
}

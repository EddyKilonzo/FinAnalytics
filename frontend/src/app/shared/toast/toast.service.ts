import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts: Toast[] = [];
  private listeners: ((t: Toast[]) => void)[] = [];
  private readonly defaultDurationMs = 5000;

  private notify() {
    this.listeners.forEach((fn) => fn([...this.toasts]));
  }

  subscribe(listener: (t: Toast[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  success(message: string, durationMs: number = this.defaultDurationMs): void {
    this.add('success', message, durationMs);
  }

  error(message: string, durationMs: number = this.defaultDurationMs): void {
    this.add('error', message, durationMs);
  }

  private add(type: ToastType, message: string, durationMs: number): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, type, message, durationMs, createdAt: Date.now() };
    this.toasts.push(toast);
    this.notify();
    setTimeout(() => this.remove(id), durationMs);
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

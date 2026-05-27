import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  readonly currentToasts = this.toasts.asReadonly();
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info', title?: string) {
    const id = this.nextId++;
    const newToast: Toast = { id, message, type, title };
    this.toasts.update((t) => [...t, newToast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.remove(id);
    }, 5000);
  }

  remove(id: number) {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}

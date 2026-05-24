import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KeepAliveService } from './core/services/keep-alive.service';
import { ToastService } from './core/services/toast.service';
import { AlertComponent } from './shared/ui/alert/alert.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  protected readonly title = signal('frontend');
  private readonly keepAliveService = inject(KeepAliveService);
  protected readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.keepAliveService.start();
  }
}

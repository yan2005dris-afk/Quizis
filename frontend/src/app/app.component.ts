import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KeepAliveService } from './core/services/keep-alive.service';
import { ToastComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  protected readonly title = signal('frontend');
  private readonly keepAliveService = inject(KeepAliveService);

  ngOnInit(): void {
    this.keepAliveService.start();
  }
}

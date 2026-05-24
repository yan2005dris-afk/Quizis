import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KeepAliveService } from './core/services/keep-alive.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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

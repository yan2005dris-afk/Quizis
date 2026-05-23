import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SocketService } from './core/services/socket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet], 
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  
  constructor(private socketService: SocketService) {}

  
  ngOnInit() {
    this.socketService.unirseASala('UPSE-123', 'Said');
  }
}
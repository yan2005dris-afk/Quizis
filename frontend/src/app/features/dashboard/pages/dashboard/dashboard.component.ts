import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LucideAngularModule, BarChart2, Play, Database } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly authService = inject(AuthService);
  protected readonly ChartIcon = BarChart2;
  protected readonly PlayIcon = Play;
  protected readonly BankIcon = Database;
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  LucideAngularModule,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart2,
  Database,
  PlayCircle,
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly authService = inject(AuthService);

  readonly isCollapsed = signal(false);

  // Iconos
  readonly DashboardIcon = LayoutDashboard;
  readonly PlayIcon = PlayCircle;
  readonly ReportesIcon = BarChart2;
  readonly DatabaseIcon = Database;
  readonly SettingsIcon = Settings;
  readonly LogOutIcon = LogOut;
  readonly MenuIcon = Menu;
  readonly CloseIcon = X;

  toggleSidebar() {
    this.isCollapsed.update((v) => !v);
  }

  logout() {
    this.authService.logout();
  }
}

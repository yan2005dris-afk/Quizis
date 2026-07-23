import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  LucideAngularModule,
  type LucideIconData,
  HelpCircle,
  LayoutDashboard,
  Database,
  PlayCircle,
  BarChart2,
  Users,
  Sparkles,
  Phone,
  Percent,
  AlertTriangle,
  ShieldAlert,
  CircleCheck,
  Link2,
} from 'lucide-angular';

interface Comodin {
  nombre: string;
  icon: LucideIconData;
  descripcion: string;
}

interface RolFila {
  rol: string;
  badgeClass: string;
  comoSeLlega: string;
  puedeHacer: string;
}

@Component({
  selector: 'app-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule, NgOptimizedImage],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent {
  private readonly document = inject(DOCUMENT);

  protected readonly HelpIcon = HelpCircle;
  protected readonly DashboardIcon = LayoutDashboard;
  protected readonly DatabaseIcon = Database;
  protected readonly PlayIcon = PlayCircle;
  protected readonly ReportesIcon = BarChart2;
  protected readonly UsersIcon = Users;
  protected readonly WarnIcon = AlertTriangle;
  protected readonly DangerIcon = ShieldAlert;
  protected readonly CheckIcon = CircleCheck;
  protected readonly LinkIcon = Link2;

  protected readonly comodines: Comodin[] = [
    {
      nombre: 'PÚBLICO',
      icon: Users,
      descripcion:
        'Habilita votación en tiempo real de los observadores conectados sobre la respuesta que creen correcta. Necesita observadores conectados para poder activarse en el momento.',
    },
    {
      nombre: 'IA',
      icon: Sparkles,
      descripcion: 'Sugerencia generada por inteligencia artificial como pista para el estudiante.',
    },
    {
      nombre: 'LLAMADA',
      icon: Phone,
      descripcion: 'Ayuda de un participante elegido — el equivalente a "llamar a un amigo".',
    },
    {
      nombre: '50/50',
      icon: Percent,
      descripcion: 'Elimina dos opciones incorrectas de la pregunta, dejando solo dos para elegir.',
    },
  ];

  protected readonly roles: RolFila[] = [
    {
      rol: 'Admin',
      badgeClass: 'help-badge--ok',
      comoSeLlega: 'Inicia sesión con su cuenta y es dueño de la sala.',
      puedeHacer:
        'Crear y editar bancos y salas, iniciar y controlar la partida en vivo, ver reportes.',
    },
    {
      rol: 'Estudiante',
      badgeClass: 'help-badge--live',
      comoSeLlega: 'Entra por el link y es promovido por el Admin desde la lista de participantes.',
      puedeHacer: 'Responder preguntas, usar comodines, chatear.',
    },
    {
      rol: 'Observador',
      badgeClass: 'help-badge--wait',
      comoSeLlega: 'Rol por defecto al entrar por el link de invitación.',
      puedeHacer:
        'Chatear y, si está activo, votar con el comodín Público. No responde preguntas.',
    },
  ];

  /**
   * El layout principal scrollea en un contenedor interno, no en `window`,
   * así que el anchorScrolling del Router no llega. scrollIntoView() sí,
   * porque scrollea el ancestro scrolleable más cercano sin importar cuál sea.
   */
  protected scrollToSection(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

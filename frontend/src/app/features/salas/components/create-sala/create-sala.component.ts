import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SalasService, SalaCreada } from '../../../../core/services/salas.service';
import {
  Bot,
  CheckCircle2,
  Database,
  FileUp,
  HelpCircle,
  LucideAngularModule,
  Phone,
  Users,
} from 'lucide-angular';
import { ButtonComponent, AlertComponent } from '../../../../shared/ui';
import {
  BancosService,
  BancoPreguntas,
  BancoPreguntasDetalle,
} from '../../../../core/services/bancos.service';
import { FileParserService, ParseError } from '../../../../core/services/file-parser.service';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { ESTADOS_SALA } from '../../../../core/constants/estados.constants';

interface SalaForm {
  nombre: string;
  descripcionBanco: string;
  estadoInicial: typeof ESTADOS_SALA.BORRADOR | typeof ESTADOS_SALA.ESPERANDO_ALUMNOS;
  bancoId: number;
  limitePreguntas: number;
  duracionTokenHoras: number;
  maxEstudiantes: number;
  comodines: Record<string, boolean>;
}

@Component({
  selector: 'app-create-sala',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, ButtonComponent, AlertComponent],
  templateUrl: './create-sala.component.html',
  styleUrl: './create-sala.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSalaComponent implements OnInit {
  private readonly salasService = inject(SalasService);
  private readonly bancosService = inject(BancosService);
  private readonly fileParser = inject(FileParserService);
  private readonly router = inject(Router);

  // Outputs
  success = output<SalaCreada>();
  closed = output<void>();

  // Icons
  protected readonly FileUpIcon = FileUp;
  protected readonly DatabaseIcon = Database;
  protected readonly CheckIcon = CheckCircle2;
  protected readonly comodinIcons: Record<string, typeof Users> = {
    PUBLICO: Users,
    IA: Bot,
    LLAMADA: Phone,
    '50_50': HelpCircle,
    SALTA_OPCION: HelpCircle,
    TIEMPO_EXTRA: HelpCircle,
  };

  // State Signals
  protected readonly bancos = signal<BancoPreguntas[]>([]);
  protected readonly bancoDetalle = signal<BancoPreguntasDetalle | null>(null);
  protected readonly loadingBancos = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly uploadErrors = signal<ParseError[]>([]);
  protected readonly selectedFileName = signal<string | null>(null);

  // Pagination Signals
  protected readonly preguntasPage = signal(0);
  protected readonly preguntasPageSize = 5;

  protected readonly preguntasPaginadas = computed(() => {
    const preguntas = this.bancoDetalle()?.preguntas ?? [];
    const start = this.preguntasPage() * this.preguntasPageSize;
    return preguntas.slice(start, start + this.preguntasPageSize);
  });

  protected readonly preguntasTotalPages = computed(() => {
    const total = this.bancoDetalle()?.preguntas?.length ?? 0;
    return Math.max(1, Math.ceil(total / this.preguntasPageSize));
  });

  protected readonly form = signal<SalaForm>({
    nombre: '',
    descripcionBanco: '',
    estadoInicial: ESTADOS_SALA.BORRADOR,
    bancoId: 0,
    limitePreguntas: 15,
    duracionTokenHoras: 24,
    maxEstudiantes: 1,
    comodines: {
      PUBLICO: true,
      IA: true,
      LLAMADA: false,
      '50_50': false,
      SALTA_OPCION: false,
      TIEMPO_EXTRA: false,
    },
  });

  ngOnInit(): void {
    this.cargarBancos();
  }

  protected cancelar(): void {
    if (!this.creating()) {
      this.closed.emit();
    }
  }

  protected actualizarCampo<K extends keyof SalaForm>(campo: K, valor: SalaForm[K]): void {
    this.form.update((form) => ({ ...form, [campo]: valor }));
  }

  protected actualizarComodin(nombre: string, activo: boolean): void {
    this.form.update((form) => ({
      ...form,
      comodines: { ...form.comodines, [nombre]: activo },
    }));
  }

  protected respuestaCorrecta(opciones: { texto: string; esCorrecta: boolean }[]): string {
    return opciones.find((opcion) => opcion.esCorrecta)?.texto ?? 'Sin respuesta marcada';
  }

  protected paginaAnteriorPreguntas(): void {
    this.preguntasPage.update((page) => Math.max(0, page - 1));
  }

  protected paginaSiguientePreguntas(): void {
    this.preguntasPage.update((page) => Math.min(this.preguntasTotalPages() - 1, page + 1));
  }

  protected seleccionarBanco(bancoId: number): void {
    this.actualizarCampo('bancoId', bancoId);
    this.bancoDetalle.set(null);
    this.preguntasPage.set(0);

    if (!bancoId) return;

    this.bancosService.getBancoById(bancoId).subscribe({
      next: (detalle) => this.bancoDetalle.set(detalle),
      error: () => this.createError.set('No se pudo cargar el detalle del banco seleccionado.'),
    });
  }

  protected async onArchivoSeleccionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFileName.set(file.name);
    this.uploadErrors.set([]);
    this.createError.set(null);

    try {
      const result = await this.fileParser.parseFile(file);
      this.uploadErrors.set(result.errores);

      if (result.preguntas.length === 0) {
        this.createError.set('El archivo no contiene preguntas validas para crear un banco.');
        return;
      }

      const nombreBanco = this.form().nombre
        ? `Banco - ${this.form().nombre}`
        : file.name.replace(/\.[^/.]+$/, '');

      this.bancosService
        .createBanco(
          nombreBanco,
          this.form().descripcionBanco || 'Banco importado desde crear sala',
          result.preguntas,
        )
        .subscribe({
          next: (banco) => {
            this.bancos.update((bancos) => [banco, ...bancos]);
            this.seleccionarBanco(banco.bancoId);
          },
          error: () => this.createError.set('No se pudo crear el banco con el archivo importado.'),
        });
    } catch {
      this.createError.set('No se pudo leer el archivo seleccionado.');
    } finally {
      input.value = '';
    }
  }

  protected guardarSala(iniciar: boolean): void {
    const form = this.form();
    this.createError.set(null);

    if (!form.nombre.trim()) {
      this.createError.set('Escribe un nombre para la sala.');
      return;
    }

    if (!form.bancoId) {
      this.createError.set('Selecciona o sube un banco de preguntas.');
      return;
    }

    this.creating.set(true);
    this.salasService
      .crearSala({
        bancoId: form.bancoId,
        nombre: form.nombre.trim(),
        limitePreguntas: Number(form.limitePreguntas) || 15,
        duracionTokenHoras: Number(form.duracionTokenHoras) || 24,
        maxEstudiantes: Number(form.maxEstudiantes) || 1,
      })
      .pipe(
        switchMap((sala: SalaCreada) =>
          this.salasService.obtenerComodines(sala.salaId).pipe(
            switchMap((comodines) => {
              const config = comodines.map((comodin) => ({
                comodinId: comodin.comodinId,
                activo: form.comodines[comodin.nombre] ?? comodin.activo,
              }));
              const configRequest = this.salasService.updateConfiguracion(sala.salaId, {
                nombre: form.nombre.trim(),
                limitePreguntas: Number(form.limitePreguntas) || 15,
                comodines: config,
              });
              const estadoRequest =
                iniciar || form.estadoInicial === ESTADOS_SALA.ESPERANDO_ALUMNOS
                  ? this.salasService.updateEstado(sala.salaId, {
                      estado: ESTADOS_SALA.ESPERANDO_ALUMNOS,
                    })
                  : of(null);

              return forkJoin([configRequest, estadoRequest]).pipe(switchMap(() => of(sala)));
            }),
          ),
        ),
        finalize(() => this.creating.set(false)),
      )
      .subscribe({
        next: (sala) => {
          this.success.emit(sala);
          void this.router.navigate(['/sala', sala.salaId]);
        },
        error: (error) => {
          this.createError.set(error?.error?.message || 'No se pudo crear la sala.');
        },
      });
  }

  private cargarBancos(): void {
    this.loadingBancos.set(true);

    this.bancosService
      .getAllBancos()
      .pipe(finalize(() => this.loadingBancos.set(false)))
      .subscribe({
        next: (bancos) => this.bancos.set(bancos),
        error: () => this.createError.set('No se pudieron cargar los bancos de preguntas.'),
      });
  }
}

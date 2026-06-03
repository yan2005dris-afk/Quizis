import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { GameOverComponent, GameOverParticipant } from './game-over.component';
import { ReportesService } from '../../../../core/services/reportes.service';
import { of } from 'rxjs';

const mockParticipants: GameOverParticipant[] = [
  {
    nickname: 'Alice',
    totalPreguntas: 10,
    correctas: 9,
    incorrectas: 1,
    porcentajeAcierto: 90,
    comodinesUsados: [],
    numeroRonda: 1,
  },
  {
    nickname: 'Bob',
    totalPreguntas: 10,
    correctas: 7,
    incorrectas: 3,
    porcentajeAcierto: 70,
    comodinesUsados: ['CINCUENTA'],
    numeroRonda: 1,
  },
  {
    nickname: 'Charlie',
    totalPreguntas: 10,
    correctas: 5,
    incorrectas: 5,
    porcentajeAcierto: 50,
    comodinesUsados: [],
    numeroRonda: 1,
  },
  {
    nickname: 'Diana',
    totalPreguntas: 10,
    correctas: 3,
    incorrectas: 7,
    porcentajeAcierto: 30,
    comodinesUsados: [],
    numeroRonda: 1,
  },
];

const mockReporte = {
  salaId: 1,
  nombreSala: 'Test Sala',
  docente: 'Teacher',
  fechaCreacion: new Date(),
  rondas: mockParticipants.map((p) => ({
    numeroRonda: 1,
    participanteNickname: p.nickname,
    totalPreguntas: p.totalPreguntas,
    correctas: p.correctas,
    incorrectas: p.incorrectas,
    porcentajeAcierto: p.porcentajeAcierto,
    comodinesUsados: p.comodinesUsados,
    preguntas: [],
  })),
  resumenGeneral: {
    totalRondas: 1,
    participantes: ['Alice', 'Bob', 'Charlie', 'Diana'],
    totalPreguntasRespondidas: 40,
    totalCorrectas: 24,
    totalIncorrectas: 16,
    porcentajeGlobal: 60,
  },
};

function createMockReportesService() {
  return {
    generarReporte: (_salaId: number) => of(mockReporte),
  };
}

describe('GameOverComponent', () => {
  let fixture: ComponentFixture<GameOverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameOverComponent],
      providers: [{ provide: ReportesService, useValue: createMockReportesService() }],
    }).compileComponents();

    fixture = TestBed.createComponent(GameOverComponent);
    fixture.componentRef.setInput('salaId', 1);
    fixture.componentRef.setInput('nombreSala', 'Test Sala');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render the game-over title (nombreSala)', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Sala');
  });

  it('should display "FIN DEL JUEGO" badge', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('FIN DEL JUEGO');
  });

  it('should show the global average metric', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Promedio global del grupo');
    // Alice 90%, Bob 70%, Charlie 50%, Diana 30% => average = 60%
    expect(el.textContent).toContain('60%');
  });

  it('should render the podium with top 3 participants in order', () => {
    const el = fixture.nativeElement as HTMLElement;
    // 1st: Alice (90%), 2nd: Bob (70%), 3rd: Charlie (50%)
    expect(el.textContent).toContain('Alice');
    expect(el.textContent).toContain('Bob');
    expect(el.textContent).toContain('Charlie');
  });

  it('should show 1st place with champion styling indicators', () => {
    const el = fixture.nativeElement as HTMLElement;
    // 1st place should have crown emoji and gold medal
    expect(el.textContent).toContain('👑');
    expect(el.textContent).toContain('🥇');
    // Alice is 1st (90%)
    expect(el.textContent).toContain('90%');
  });

  it('should show the remaining participants table beyond the podium', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Diana');
    expect(el.textContent).toContain('Clasificación completa');
  });

  it('should show action buttons (analytics and home)', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ver analíticas');
    expect(el.textContent).toContain('Salir del podio');
  });
});

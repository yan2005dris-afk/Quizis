import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginAudiencia } from './login-audiencia';

describe('LoginAudiencia', () => {
  let component: LoginAudiencia;
  let fixture: ComponentFixture<LoginAudiencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginAudiencia],
      providers: [provideRouter([])] // Asegura un entorno simulado de rutas limpio
    }).compileComponents();

    fixture = TestBed.createComponent(LoginAudiencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BancosService } from './bancos.service';
import { environment } from '../../../environments/environment';

describe('BancosService', () => {
  let service: BancosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BancosService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BancosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const apiUrl = `${environment.apiUrl}/bancos`;

  describe('crearPreguntas', () => {
    const preguntasMock = [
      {
        texto: 'Pregunta 1',
        opciones: [
          { texto: 'Correcta', esCorrecta: true },
          { texto: 'Incorrecta', esCorrecta: false },
        ],
        categoria: 'Test',
        nivel: 1,
      },
    ];

    it('should POST JSON body to /bancos/:id/preguntas', () => {
      const bancoId = 42;
      const mockResponse = { totalCreadas: 1, bancoId: 42 };

      service.crearPreguntas(bancoId, preguntasMock).subscribe((res) => {
        expect(res.totalCreadas).toBe(1);
        expect(res.bancoId).toBe(42);
      });

      const req = httpMock.expectOne(`${apiUrl}/${bancoId}/preguntas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(preguntasMock);
      req.flush({ success: true, message: 'Ok', data: mockResponse });
    });
  });

  describe('createBanco', () => {
    it('should create a new bank', () => {
      const mockBank = { bancoId: 1, nombre: 'Test', descripcion: 'Desc' };
      service.createBanco('Test', 'Desc').subscribe((res) => {
        expect(res).toEqual(mockBank);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nombre: 'Test', descripcion: 'Desc' });
      req.flush({ success: true, message: 'Ok', data: mockBank });
    });
  });

  describe('getAllBancos', () => {
    it('should return all banks', () => {
      const mockBanks = [{ bancoId: 1, nombre: 'Test' }];
      service.getAllBancos().subscribe((res) => {
        expect(res).toEqual(mockBanks);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, message: 'Ok', data: mockBanks });
    });
  });

  describe('getBancoById', () => {
    it('should return a bank by id', () => {
      const mockBank = { bancoId: 1, nombre: 'Test', preguntas: [] };
      service.getBancoById(1).subscribe((res) => {
        expect(res).toEqual(mockBank);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, message: 'Ok', data: mockBank });
    });
  });
});

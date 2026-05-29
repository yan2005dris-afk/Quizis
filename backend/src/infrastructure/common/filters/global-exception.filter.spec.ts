import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; method: string };
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = { url: '/api/test', method: 'POST' };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('BadRequestException con mensaje string → 400 con mensaje', () => {
    filter.catch(new BadRequestException('Campo requerido'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Campo requerido');
  });

  it('BadRequestException con errores de validación → errors array', () => {
    const ex = new BadRequestException({
      message: ['nombre es requerido', 'email inválido'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(ex, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.errors).toEqual(['nombre es requerido', 'email inválido']);
  });

  it('NotFoundException → 404', () => {
    filter.catch(new NotFoundException('Recurso no encontrado'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
  });

  it('HttpException genérica → status correcto', () => {
    filter.catch(new HttpException('Conflict', HttpStatus.CONFLICT), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
  });

  it('Error genérico (no HTTP) → 500', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    filter.catch(new Error('DB connection failed'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Error interno del servidor');

    process.env.NODE_ENV = originalEnv;
  });

  it('respuesta incluye path, method y timestamp', () => {
    filter.catch(new BadRequestException('Test'), mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.path).toBe('/api/test');
    expect(body.method).toBe('POST');
    expect(body.timestamp).toBeDefined();
  });
});

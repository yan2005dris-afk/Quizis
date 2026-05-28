import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({ url: '/test', method: 'POST' }),
      }),
    };
  });

  it('should handle BadRequestException with string message → status 400', () => {
    filter.catch(new BadRequestException('Email ya existe'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Email ya existe',
      }),
    );
  });

  it('should handle BadRequestException with array errors (ValidationPipe) → errors array', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'password is required'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Error de validación',
        errors: ['email must be an email', 'password is required'],
      }),
    );
  });

  it('should handle NotFoundException with correct status 404', () => {
    filter.catch(new NotFoundException('Usuario no encontrado'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Usuario no encontrado',
      }),
    );
  });

  it('should handle generic Error as 500 with generic message in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    filter.catch(new Error('Database crash'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Error interno del servidor',
      }),
    );

    process.env.NODE_ENV = originalEnv;
  });
});

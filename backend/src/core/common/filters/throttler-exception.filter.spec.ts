import { ThrottlerException } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from './throttler-exception.filter';

describe('ThrottlerExceptionFilter', () => {
  let filter: ThrottlerExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    getHeader: jest.Mock;
  };
  let mockRequest: { url: string };
  let mockHost: any;

  beforeEach(() => {
    filter = new ThrottlerExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      getHeader: jest.fn(),
    };

    mockRequest = { url: '/api/endpoint' };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('responde con 429 Too Many Requests', () => {
    mockResponse.getHeader.mockReturnValue(null);

    filter.catch(new ThrottlerException(), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(429);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(429);
    expect(body.error).toBe('rate_limit_exceeded');
  });

  it('retryAfter usa header Retry-After si existe', () => {
    mockResponse.getHeader.mockReturnValue('30');

    filter.catch(new ThrottlerException(), mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.retryAfter).toBe(30);
  });

  it('retryAfter usa 60 por defecto si no hay header', () => {
    mockResponse.getHeader.mockReturnValue(null);

    filter.catch(new ThrottlerException(), mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.retryAfter).toBe(60);
  });

  it('respuesta incluye path y timestamp', () => {
    mockResponse.getHeader.mockReturnValue(null);

    filter.catch(new ThrottlerException(), mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.path).toBe('/api/endpoint');
    expect(body.timestamp).toBeDefined();
  });
});

import { validateSafeUrl, readLimitedText } from './url.util';

jest.mock('dns/promises', () => ({
  lookup: jest.fn().mockImplementation((hostname: string) => {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return Promise.resolve({ address: '127.0.0.1', family: 4 });
    }
    if (hostname === '192.168.1.1') {
      return Promise.resolve({ address: '192.168.1.1', family: 4 });
    }
    if (hostname === '169.254.169.254') {
      return Promise.resolve({ address: '169.254.169.254', family: 4 });
    }
    if (hostname === 'example.com') {
      return Promise.resolve({ address: '93.184.216.34', family: 4 });
    }
    return Promise.reject(new Error(`getaddrinfo ENOTFOUND ${hostname}`));
  }),
}));

describe('UrlUtil', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('debería permitir URLs públicas seguras (HTTP/HTTPS)', async () => {
    const result = await validateSafeUrl('https://example.com');
    expect(result.safe).toBe(true);
  });

  it('debería denegar protocolos no permitidos (p. ej. FTP)', async () => {
    const result = await validateSafeUrl('ftp://example.com');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Protocolo no permitido');
  });

  it('debería denegar URLs inválidas', async () => {
    const result = await validateSafeUrl('not-a-url');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('URL inválida');
  });

  it('debería bloquear IPs privadas/loopback en producción', async () => {
    process.env.NODE_ENV = 'production';

    const loopback = await validateSafeUrl('http://127.0.0.1');
    const privateV4 = await validateSafeUrl('http://192.168.1.1');
    const linkLocal = await validateSafeUrl('http://169.254.169.254');

    expect(loopback.safe).toBe(false);
    expect(loopback.error).toContain('IP privada o de loopback');

    expect(privateV4.safe).toBe(false);
    expect(privateV4.error).toContain('IP privada o de loopback');

    expect(linkLocal.safe).toBe(false);
    expect(linkLocal.error).toContain('IP privada o de loopback');
  });

  it('debería permitir IPs privadas/loopback en desarrollo/test', async () => {
    process.env.NODE_ENV = 'test';

    const loopback = await validateSafeUrl('http://127.0.0.1');
    expect(loopback.safe).toBe(true);
  });

  describe('readLimitedText', () => {
    it('debería leer el texto completo si no supera el límite', async () => {
      const response = new Response('hola mundo');
      const text = await readLimitedText(response);
      expect(text).toBe('hola mundo');
    });

    it('debería truncar el texto si supera el límite de bytes', async () => {
      const chunks = [
        new TextEncoder().encode('parte1 '),
        new TextEncoder().encode('parte2 '),
        new TextEncoder().encode('parte3 '),
      ];

      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const response = new Response(stream);
      const text = await readLimitedText(response, 10);
      expect(text).toContain('Response Truncated');
    });
  });
});

import { lookup } from 'dns/promises';

/**
 * Valida si una URL es segura para realizar peticiones externas (prevención de SSRF).
 * Bloquea protocolos que no sean HTTP/HTTPS y destinos que resuelvan a IPs de loopback o privadas.
 */
export async function validateSafeUrl(
  urlString: string,
): Promise<{ safe: boolean; error?: string }> {
  try {
    const url = new URL(urlString);

    // 1. Validar protocolo (solo HTTP y HTTPS)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        safe: false,
        error: `Protocolo no permitido: ${url.protocol}. Solo se permite HTTP y HTTPS.`,
      };
    }

    const hostname = url.hostname;

    // 2. Resolver el host mediante DNS
    let address: string;
    let family: number;
    try {
      const result = await lookup(hostname);
      address = result.address;
      family = result.family;
    } catch (dnsErr) {
      return {
        safe: false,
        error: `No se pudo resolver el host "${hostname}": ${(dnsErr as Error).message}`,
      };
    }

    // 3. Validar si es una IP privada o loopback
    const isDevOrTest =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (isPrivateIp(address, family) && !isDevOrTest) {
      return {
        safe: false,
        error: `La dirección destino ${address} es una IP privada o de loopback (SSRF bloqueado).`,
      };
    }

    return { safe: true };
  } catch (err) {
    return {
      safe: false,
      error: `URL inválida o con formato incorrecto: ${(err as Error).message}`,
    };
  }
}

/**
 * Determina si una dirección IP pertenece a rangos privados o de loopback.
 */
function isPrivateIp(ip: string, family: number): boolean {
  if (family === 4) {
    // IPv4 Loopback (127.0.0.0/8)
    if (ip.startsWith('127.')) return true;

    // IPv4 RFC1918 (Privadas)
    // 10.0.0.0/8
    if (ip.startsWith('10.')) return true;
    // 172.16.0.0/12
    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const secondPart = parseInt(parts[1], 10);
      if (secondPart >= 16 && secondPart <= 31) return true;
    }
    // 192.168.0.0/16
    if (ip.startsWith('192.168.')) return true;

    // IPv4 Link-local / APIPA (169.254.0.0/16)
    if (ip.startsWith('169.254.')) return true;

    // Broadcast (255.255.255.255) / Wildcard (0.0.0.0)
    if (ip === '255.255.255.255' || ip === '0.0.0.0') return true;
  } else if (family === 6) {
    // IPv6 Loopback (::1)
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

    // IPv6 Link-local (fe80::/10)
    if (ip.toLowerCase().startsWith('fe80:')) return true;

    // IPv6 Unique Local Address (fc00::/7)
    if (
      ip.toLowerCase().startsWith('fc00:') ||
      ip.toLowerCase().startsWith('fd00:')
    )
      return true;
  }

  return false;
}

/**
 * Lee el cuerpo de una respuesta de forma segura con un límite de bytes leídos (evita OOM por respuestas masivas).
 */
export async function readLimitedText(
  response: Response,
  limitBytes = 10240,
): Promise<string> {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        bytesRead += value.length;
        result += decoder.decode(value, { stream: true });

        if (bytesRead > limitBytes) {
          await reader.cancel('Response size limit exceeded');
          result = result.substring(0, limitBytes) + '... [Response Truncated]';
          break;
        }
      }
    }
  } catch (error) {
    result += `\n[Error reading response: ${(error as Error).message}]`;
  } finally {
    reader.releaseLock();
  }

  return result;
}

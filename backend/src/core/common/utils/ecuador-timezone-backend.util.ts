import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export class EcuadorTimezoneUtil {
  /**
   * Zona horaria de Ecuador
   */
  private static readonly ECUADOR_TIMEZONE =
    process.env.TZ || 'America/Guayaquil';

  /**
   * Convierte una fecha UTC a zona horaria de Ecuador
   * @param fecha Fecha UTC a convertir
   * @returns Nueva fecha en zona horaria de Ecuador
   */
  public static toEcuadorTimezone(fecha: Date): Date {
    return toZonedTime(fecha, this.ECUADOR_TIMEZONE);
  }

  /**
   * Convierte una fecha de zona horaria de Ecuador a UTC
   * @param fecha Fecha en zona horaria de Ecuador
   * @returns Fecha equivalente en UTC
   */
  public static fromEcuadorToUTC(fecha: Date): Date {
    return fromZonedTime(fecha, this.ECUADOR_TIMEZONE);
  }

  /**
   * Obtiene el día de la semana (0-6, domingo=0) de una fecha en zona horaria de Ecuador
   * @param fecha Fecha UTC a evaluar
   * @returns Día de la semana (0=domingo, 1=lunes, ..., 6=sábado)
   */
  public static getEcuadorDayOfWeek(fecha: Date): number {
    const ecuadorTime = this.toEcuadorTimezone(fecha);
    return ecuadorTime.getDay();
  }

  /**
   * Obtiene la hora actual en zona horaria de Ecuador (0-23)
   * @returns Hora actual en Ecuador
   */
  public static getCurrentEcuadorHour(): number {
    const now = new Date();
    const ecuadorTime = this.toEcuadorTimezone(now);
    return ecuadorTime.getHours();
  }

  /**
   * Formatea una fecha UTC como string ISO 8601 con el offset de Ecuador
   * @param fecha Fecha UTC a formatear
   * @returns String ISO con offset de Ecuador (YYYY-MM-DDTHH:mm:ss-05:00)
   */
  public static formatAsEcuadorISO(fecha: Date): string {
    return formatInTimeZone(
      fecha,
      this.ECUADOR_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
  }
}

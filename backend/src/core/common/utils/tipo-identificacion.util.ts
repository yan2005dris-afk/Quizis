export class TipoIdentificacionUtil {
  // =========================
  // VALIDACIÓN DE CÉDULA
  // =========================
  private static esCedula(cedula: string): boolean {
    if (cedula.length !== 10 || !/^\d+$/.test(cedula)) {
      return false;
    }

    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = parseInt(cedula[2]);
    if (tercerDigito > 5) return false;

    const digitoVerificador = parseInt(cedula[9]);

    let total = 0;
    let coeficiente = 2;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula[i]) * coeficiente;
      if (valor >= 10) valor -= 9;
      total += valor;
      coeficiente = coeficiente === 2 ? 1 : 2;
    }

    const residuo = total % 10;
    const resultado = residuo === 0 ? 0 : 10 - residuo;

    return resultado === digitoVerificador;
  }

  // =========================
  // RUC PRIVADO (tercer dígito = 9)
  // =========================
  private static validarRucPrivado(ruc: string): boolean {
    if (!ruc.endsWith('001')) return false;

    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      suma += parseInt(ruc[i]) * coeficientes[i];
    }

    const residuo = suma % 11;
    let verificador = 11 - residuo;

    if (verificador === 11) verificador = 0;
    if (verificador === 10) verificador = 1;

    return verificador === parseInt(ruc[9]);
  }

  // =========================
  // RUC PÚBLICO (tercer dígito = 6)
  // =========================
  private static validarRucPublico(ruc: string): boolean {
    if (!ruc.endsWith('0001')) return false;

    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 8; i++) {
      suma += parseInt(ruc[i]) * coeficientes[i];
    }

    const residuo = suma % 11;
    let verificador = 11 - residuo;

    if (verificador === 11) verificador = 0;
    if (verificador === 10) verificador = 1;

    return verificador === parseInt(ruc[8]);
  }

  // =========================
  // VALIDACIÓN DE RUC GENERAL
  // =========================
  private static esRuc(ruc: string): boolean {
    if (!/^\d{13}$/.test(ruc)) return false;

    const provincia = parseInt(ruc.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = parseInt(ruc[2]);

    // Persona natural
    if (tercerDigito >= 0 && tercerDigito <= 5) {
      return this.esCedula(ruc.substring(0, 10)) && ruc.endsWith('001');
    }

    // Empresa privada
    if (tercerDigito === 9) {
      return this.validarRucPrivado(ruc);
    }

    // Entidad pública
    if (tercerDigito === 6) {
      return this.validarRucPublico(ruc);
    }

    return false;
  }

  // =========================
  // OTROS DOCUMENTOS
  // =========================
  private static esPasaporteEcuatoriano(pasaporte: string): boolean {
    return /^[A-Za-z0-9]{6,15}$/.test(pasaporte);
  }

  private static esIdentificacionExtranjera(doc: string): boolean {
    return doc.length >= 6;
  }

  // =========================
  // MÉTODO PRINCIPAL
  // =========================
  static validar(tipoCodigo: string, valor: string): boolean {
    switch (tipoCodigo) {
      case '05': // CÉDULA (SRI code)
      case 'CEDULA':
        return this.esCedula(valor);
      case '04': // RUC (SRI code)
      case 'RUC':
        return this.esRuc(valor);
      case '06': // PASAPORTE (SRI code)
      case 'PASAPORTE':
        return this.esPasaporteEcuatoriano(valor);
      case '08': // IDENTIFICACIÓN DEL EXTERIOR (SRI code)
      case 'IDENTIFICACION_EXTRANJERA':
        return this.esIdentificacionExtranjera(valor);
      case '07': // CONSUMIDOR FINAL (SRI code)
      case 'CONSUMIDOR_FINAL':
        return true;
      default:
        return false;
    }
  }
}

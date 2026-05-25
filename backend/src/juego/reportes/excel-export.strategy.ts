import * as ExcelJS from 'exceljs';
import { ReportDataDto } from './dtos/report-data.dto';
import { format } from 'date-fns';

export class ExcelExportStrategy {
  async export(data: ReportDataDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    this.crearHojaPortada(workbook, data);
    this.crearHojaDetalleRondas(workbook, data);
    this.crearHojaEstadisticas(workbook, data);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  private crearHojaPortada(workbook: ExcelJS.Workbook, data: ReportDataDto) {
    const sheet = workbook.addWorksheet('Portada');

    sheet.columns = [
      { width: 35, key: 'label' },
      { width: 50, key: 'valor' },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4788' },
    };

    sheet.addRow({ label: 'REPORTE DE PARTIDA - QUIZIS', valor: '' });
    sheet.addRow({ label: '', valor: '' });
    sheet.addRow({ label: 'Sala', valor: data.nombreSala });
    sheet.addRow({ label: 'Docente / Administrador', valor: data.docente });
    sheet.addRow({
      label: 'Fecha de Creación',
      valor: format(data.fechaCreacion, 'dd/MM/yyyy HH:mm:ss'),
    });
    sheet.addRow({ label: '', valor: '' });
    sheet.addRow({ label: 'RESUMEN GENERAL', valor: '' });
    sheet.addRow({
      label: 'Total de Rondas',
      valor: data.resumenGeneral.totalRondas,
    });
    sheet.addRow({
      label: 'Participantes',
      valor: data.resumenGeneral.participantes.join(', '),
    });
    sheet.addRow({
      label: 'Total de Preguntas Respondidas',
      valor: data.resumenGeneral.totalPreguntasRespondidas,
    });
    sheet.addRow({
      label: 'Respuestas Correctas',
      valor: data.resumenGeneral.totalCorrectas,
    });
    sheet.addRow({
      label: 'Respuestas Incorrectas',
      valor: data.resumenGeneral.totalIncorrectas,
    });
    sheet.addRow({
      label: 'Porcentaje de Éxito Global',
      valor: `${data.resumenGeneral.porcentajeGlobal}%`,
    });
  }

  private crearHojaDetalleRondas(
    workbook: ExcelJS.Workbook,
    data: ReportDataDto,
  ) {
    const sheet = workbook.addWorksheet('Detalle de Rondas');

    sheet.columns = [
      { header: 'Ronda', width: 10, key: 'ronda' },
      { header: 'Participante', width: 20, key: 'participante' },
      { header: 'Preg.', width: 8, key: 'preg' },
      { header: 'Pregunta', width: 45, key: 'pregunta' },
      { header: 'Respuesta', width: 25, key: 'respuesta' },
      { header: 'Correcta', width: 12, key: 'correcta' },
      { header: 'Comodín', width: 15, key: 'comodin' },
      { header: '% Público', width: 12, key: 'porcentaje' },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    data.rondas.forEach((ronda) => {
      ronda.preguntas.forEach((pregunta) => {
        const row = sheet.addRow({
          ronda: ronda.numeroRonda,
          participante: ronda.participanteNickname,
          preg: pregunta.numero,
          pregunta: pregunta.texto,
          respuesta: pregunta.respuestaElegida,
          correcta: pregunta.esCorrecta ? '✓' : '✗',
          comodin: pregunta.comodinUsado || '—',
          porcentaje: pregunta.porcentajeVotosPublico
            ? `${pregunta.porcentajeVotosPublico.toFixed(1)}%`
            : '—',
        });

        const celdaCorrecta = row.getCell('correcta');
        if (pregunta.esCorrecta) {
          celdaCorrecta.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' },
          };
          celdaCorrecta.font = { bold: true, color: { argb: 'FF00B050' } };
        } else {
          celdaCorrecta.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' },
          };
          celdaCorrecta.font = { bold: true, color: { argb: 'FFC00000' } };
        }
      });

      sheet.addRow({
        ronda: '',
        participante: '',
        preg: '',
        pregunta: '',
        respuesta: '',
        correcta: '',
        comodin: '',
        porcentaje: '',
      });
    });
  }

  private crearHojaEstadisticas(
    workbook: ExcelJS.Workbook,
    data: ReportDataDto,
  ) {
    const sheet = workbook.addWorksheet('Estadísticas');

    sheet.columns = [
      { header: 'Participante', width: 20, key: 'participante' },
      { header: 'Ronda', width: 10, key: 'ronda' },
      { header: 'Preguntas', width: 12, key: 'preguntas' },
      { header: 'Correctas', width: 12, key: 'correctas' },
      { header: 'Incorrectas', width: 12, key: 'incorrectas' },
      { header: '% Acierto', width: 12, key: 'porcentaje' },
      { header: 'Comodines', width: 30, key: 'comodines' },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };

    data.rondas.forEach((ronda) => {
      sheet.addRow({
        participante: ronda.participanteNickname,
        ronda: ronda.numeroRonda,
        preguntas: ronda.totalPreguntas,
        correctas: ronda.correctas,
        incorrectas: ronda.incorrectas,
        porcentaje: `${ronda.porcentajeAcierto}%`,
        comodines: ronda.comodinesUsados.join(', ') || 'Ninguno',
      });
    });

    sheet.addRow({
      participante: '',
      ronda: '',
      preguntas: '',
      correctas: '',
      incorrectas: '',
      porcentaje: '',
      comodines: '',
    });
    sheet.addRow({
      participante: 'GLOBAL',
      ronda: '—',
      preguntas: data.resumenGeneral.totalPreguntasRespondidas,
      correctas: data.resumenGeneral.totalCorrectas,
      incorrectas: data.resumenGeneral.totalIncorrectas,
      porcentaje: `${data.resumenGeneral.porcentajeGlobal}%`,
      comodines: '—',
    });
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class OpcionParseadaEntity {
  @ApiProperty({
    description: 'Texto de la opción de respuesta',
    example: 'París',
  })
  texto!: string;

  @ApiProperty({
    description: 'Indica si esta opción es la correcta',
    example: true,
  })
  esCorrecta!: boolean;
}

export class PreguntaParseadaEntity {
  @ApiProperty({
    description: 'Texto de la pregunta',
    example: '¿Cuál es la capital de Francia?',
  })
  texto!: string;

  @ApiProperty({
    description: 'Categoría temática de la pregunta',
    example: 'Geografía',
    required: false,
  })
  categoria?: string;

  @ApiProperty({
    description: 'Nivel de dificultad (1 = más fácil)',
    example: 1,
    required: false,
  })
  nivel?: number;

  @ApiProperty({
    description: 'Monto en puntos asociado a la pregunta',
    example: 1000,
    required: false,
  })
  monto?: number;

  @ApiProperty({
    description: 'Texto de retroalimentación cuando la respuesta es correcta',
    example: '¡Correcto! París es la capital de Francia.',
    required: false,
  })
  feedbackCorrecto?: string;

  @ApiProperty({
    description: 'Texto de retroalimentación cuando la respuesta es incorrecta',
    example: 'La respuesta correcta era París.',
    required: false,
  })
  feedbackIncorrecto?: string;

  @ApiProperty({
    description: 'Las 4 opciones de respuesta de la pregunta',
    type: [OpcionParseadaEntity],
  })
  opciones!: OpcionParseadaEntity[];
}

export class ErrorParseoEntity {
  @ApiProperty({
    description:
      'Número de fila donde se encontró el error (1 = primera fila de datos)',
    example: 3,
  })
  fila!: number;

  @ApiProperty({
    description: 'Campo o columna donde se encontró el error',
    example: 'opciones',
  })
  campo!: string;

  @ApiProperty({
    description: 'Descripción del error encontrado',
    example: 'La pregunta debe tener exactamente 4 opciones de respuesta.',
  })
  mensaje!: string;
}

export class PreviewCargaMasivaEntity {
  @ApiProperty({
    description: 'Total de preguntas detectadas y parseadas correctamente',
    example: 15,
  })
  totalDetectadas!: number;

  @ApiProperty({
    description: 'Total de filas con errores de formato',
    example: 2,
  })
  totalErrores!: number;

  @ApiProperty({
    description: 'Formato del archivo recibido',
    example: 'excel',
    enum: ['json', 'csv', 'excel'],
  })
  formato!: string;

  @ApiProperty({
    description: 'Preguntas parseadas exitosamente, listas para guardar',
    type: [PreguntaParseadaEntity],
  })
  preguntas!: PreguntaParseadaEntity[];

  @ApiProperty({
    description: 'Errores de formato encontrados en el archivo',
    type: [ErrorParseoEntity],
  })
  errores!: ErrorParseoEntity[];
}

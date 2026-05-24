import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsString,
  IsIn,
} from 'class-validator';

export class CreatePreguntaDto {

  @IsString({
    message: 'La pregunta debe ser texto',
  })
  @IsNotEmpty({
    message: 'La pregunta es obligatoria',
  })
  pregunta!: string;

  @IsArray({
    message: 'Las opciones deben ser un arreglo',
  })
  @ArrayMinSize(4, {
    message: 'Debe haber exactamente 4 opciones',
  })
  @ArrayMaxSize(4, {
    message: 'Debe haber exactamente 4 opciones',
  })
  @IsString({
    each: true,
    message: 'Cada opción debe ser texto',
  })
  opciones!: string[];

  @IsString({
    message: 'La respuesta correcta debe ser texto',
  })
  @IsIn(['A', 'B', 'C', 'D'], {
    message: 'La respuesta correcta debe ser A, B, C o D',
  })
  respuestaCorrecta!: string;

}
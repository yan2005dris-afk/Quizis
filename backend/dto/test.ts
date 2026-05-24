import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePreguntaDto } from './dto/create-pregunta.dto';

async function test() {

  const pregunta = {
    pregunta: 'Capital del Ecuador',
    opciones: ['Quito', 'Loja', 'Cuenca', 'Manta'],
    respuestaCorrecta: 'A',
  };

  const dto = plainToInstance(CreatePreguntaDto, pregunta);

  const errores = await validate(dto);

  if (errores.length > 0) {

    console.log('❌ Hay errores');

    console.log(
      JSON.stringify(errores, null, 2)
    );

  } else {

    console.log('✅ Todo correcto');

  }

}

test();
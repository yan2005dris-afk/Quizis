import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class GetIaSuggestionUseCase {
  private readonly logger = new Logger(GetIaSuggestionUseCase.name);
  private readonly openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async execute(preguntaId: number): Promise<any> {
    try {
      this.logger.log(`Obteniendo sugerencia de IA para pregunta ID: ${preguntaId}`);

      // 1. Obtener la pregunta y sus opciones de la base de datos
      const pregunta = await this.prisma.preguntas.findUnique({
        where: { preguntaId },
        include: {
          opciones: {
            orderBy: { opcionId: 'asc' },
          },
        },
      });

      if (!pregunta) {
        throw new NotFoundException(`La pregunta con ID ${preguntaId} no existe.`);
      }

      // 2. Formatear el contexto para la IA
      const opcionesTexto = pregunta.opciones
        .map((op, index) => `${String.fromCharCode(65 + index)}) ${op.texto}`)
        .join('\n');

      this.logger.log('Consultando a OpenAI con contexto de opciones...');

      // 3. Consultar a OpenAI usando el modo JSON para respuesta estructurada
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente experto en trivias académicas. 
            Analiza la pregunta y las opciones proporcionadas. 
            Debes responder EXCLUSIVAMENTE en formato JSON con la siguiente estructura:
            {
              "literal": "A|B|C|D",
              "explicacion": "Breve explicación de por qué es la correcta"
            }`,
          },
          { 
            role: 'user', 
            content: `Pregunta: ${pregunta.texto}\n\nOpciones:\n${opcionesTexto}` 
          },
        ],
        response_format: { type: 'json_object' },
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      
      this.logger.log(`IA sugiere opción ${response.literal}`);

      return response;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      
      this.logger.error('Error con OpenAI:', error.message);
      throw new InternalServerErrorException('Error al contactar a la IA para la sugerencia');
    }
  }
}

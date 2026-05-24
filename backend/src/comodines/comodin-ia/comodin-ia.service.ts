import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai'; // Importamos la librería de OpenAI

@Injectable()
export class ComodinIaService {
  private readonly logger = new Logger(ComodinIaService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    // IMPORTANTE: Asegúrate de que en tu archivo .env la variable se llame OPENAI_API_KEY
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async obtenerSugerenciaIa(pregunta: string): Promise<any> {
    try {
      this.logger.log('Consultando a OpenAI...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Puedes cambiarlo a 'gpt-3.5-turbo' si buscas algo más económico
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente experto en trivias académicas. Da sugerencias breves y precisas.',
          },
          { role: 'user', content: pregunta },
        ],
      });

      // Retornamos el mismo formato que esperaba tu frontend
      return { sugerencia: completion.choices[0].message.content };
    } catch (error: any) {
      this.logger.error('Error con OpenAI:', error.message);
      throw new InternalServerErrorException('Error al contactar a la IA');
    }
  }
}

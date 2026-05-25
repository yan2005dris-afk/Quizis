import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GetIaSuggestionUseCase {
  private readonly logger = new Logger(GetIaSuggestionUseCase.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async execute(pregunta: string): Promise<any> {
    try {
      this.logger.log('Consultando a OpenAI para sugerencia...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente experto en trivias académicas. Da sugerencias breves y precisas.',
          },
          { role: 'user', content: pregunta },
        ],
      });

      return { sugerencia: completion.choices[0].message.content };
    } catch (error: any) {
      this.logger.error('Error con OpenAI:', error.message);
      throw new InternalServerErrorException('Error al contactar a la IA');
    }
  }
}

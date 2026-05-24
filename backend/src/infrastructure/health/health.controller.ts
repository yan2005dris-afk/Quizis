import { Controller, Get, Logger } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Public()
  @Get()
  check() {
    this.logger.log('Health check request received');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

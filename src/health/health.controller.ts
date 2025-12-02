import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Transaction Management API is running',
      timestamp: new Date().toISOString(),
    };
  }
}

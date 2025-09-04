import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthController } from './health.controller';

@Controller('api')
export class ApiHealthController {
  constructor(private readonly healthController: HealthController) {}

  @Get('health')
  async checkHealth(@Res() res: Response) {
    // Delegate to the existing health controller
    return this.healthController.checkHealth(res);
  }

  @Get('health/status')
  async getDetailedStatus(@Res() res: Response) {
    return this.healthController.getDetailedStatus(res);
  }

  @Get('health/restart-status')
  async getRestartStatus(@Res() res: Response) {
    return this.healthController.getRestartStatus(res);
  }
}

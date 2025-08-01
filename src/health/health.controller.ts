import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  async checkHealth(@Res() res: Response) {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          cpuUsage: process.cpuUsage(),
        },
        services: {
          database: await this.checkDatabaseHealth(),
          openai: await this.checkOpenAIHealth(),
        },
      };

      // Check if any critical services are down
      const criticalServicesDown = Object.values(healthData.services).some(
        (service: any) => service.status !== 'healthy',
      );

      if (criticalServicesDown) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          ...healthData,
          status: 'degraded',
        });
      }

      return res.status(HttpStatus.OK).json(healthData);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async checkDatabaseHealth(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      // Simple database ping - adjust based on your database setup
      // If you have PrismaService injected, you can use it here
      // await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'OpenAI service check failed',
      };
    }
  }

  private async checkOpenAIHealth(): Promise<{
    status: string;
    error?: string;
  }> {
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'unhealthy',
          error: 'OpenAI API key not configured',
        };
      }

      return {
        status: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'OpenAI service check failed',
      };
    }
  }
}

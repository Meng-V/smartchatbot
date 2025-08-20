import { Controller, Get, Post, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Controller('health')
export class HealthController {
  private lastRateLimitLog: number | undefined;
  @Get()
  async checkHealth(@Res() res: Response) {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
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
          externalApis: await this.checkExternalApisHealth(),
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
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
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

  private async checkExternalApisHealth(): Promise<{
    status: string;
    error?: string;
    details?: any;
  }> {
    try {
      // Test Google Custom Search API since that's the main external API we use
      const testUrl = 'https://www.googleapis.com/customsearch/v1';
      const testParams = {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID,
        q: 'library',
        num: 1,
      };

      const response = await axios.get(testUrl, {
        params: testParams,
        timeout: 5000, // 5 second timeout
      });

      return {
        status: 'healthy',
        details: {
          responseStatus: response.status,
          testUrl: testUrl,
        },
      };
    } catch (error: any) {
      // If external API returns 400, 403, 500, or 503, mark as unhealthy to trigger restart
      // These errors indicate issues the server can't handle gracefully
      // 429 (Rate Limiting) should not trigger restart - it's expected behavior
      const problematicStatuses = [400, 403, 500, 503];
      if (problematicStatuses.includes(error.response?.status)) {
        const statusMessages: { [key: number]: string } = {
          400: 'Bad Request',
          403: 'Forbidden',
          500: 'Internal Server Error',
          503: 'Service Unavailable',
        };

        return {
          status: 'unhealthy',
          error: `External API returned ${error.response?.status}: ${error.response?.data || statusMessages[error.response?.status]}`,
          details: {
            responseStatus: error.response?.status,
            responseData: error.response?.data,
          },
        };
      }

      // For other errors (network, timeout, rate limiting, etc.), don't trigger restart
      if (error.response?.status === 429) {
        // Rate limiting is expected - only log occasionally to avoid spam
        if (
          !this.lastRateLimitLog ||
          Date.now() - this.lastRateLimitLog > 300000
        ) {
          // Log once every 5 minutes
          console.log(
            'External API rate limited (429) - this is expected behavior (suppressing further logs for 5 minutes)',
          );
          this.lastRateLimitLog = Date.now();
        }
      } else {
        console.warn(
          'External API health check failed (non-critical):',
          error.message,
        );
      }
      return {
        status: 'healthy', // Don't restart for network issues
        error: `External API warning: ${error.message}`,
        details: {
          errorType: 'network_or_timeout',
        },
      };
    }
  }

  @Post('restart')
  async triggerRestart(@Res() res: Response) {
    try {
      console.log('🔄 Manual restart triggered via health endpoint');

      // Log the restart request
      const restartLog = {
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
        trigger: 'manual_health_endpoint',
        reason: 'Manual restart requested',
      };

      fs.writeFileSync(
        path.join(process.cwd(), 'restart-log.json'),
        JSON.stringify(restartLog, null, 2),
      );

      // Create restart flag
      fs.writeFileSync(
        path.join(process.cwd(), '.restart-flag'),
        new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
      );

      res.status(HttpStatus.OK).json({
        status: 'restart_initiated',
        message: 'Server restart has been triggered',
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
      });

      // Trigger restart after sending response
      setTimeout(() => {
        console.log('🔄 Initiating restart...');
        // Force close all connections and exit
        if (process.platform === 'win32') {
          process.kill(process.pid, 'SIGTERM');
        } else {
          process.kill(process.pid, 'SIGTERM');
        }
        // Fallback to force exit if SIGTERM doesn't work
        setTimeout(() => {
          console.log('🔄 Force exiting...');
          process.exit(1);
        }, 2000);
      }, 1000);

      return; // Explicit return to satisfy TypeScript
    } catch (error) {
      console.error('❌ Failed to trigger restart:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'restart_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
      });
    }
  }

  @Get('status')
  async getDetailedStatus(@Res() res: Response) {
    try {
      const status = {
        server: {
          status: 'running',
          uptime: process.uptime(),
          timestamp: new Date().toLocaleString('en-US', {
            timeZone: 'America/New_York',
            timeZoneName: 'short',
          }),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        services: {
          database: await this.checkDatabaseHealth(),
          openai: await this.checkOpenAIHealth(),
        },
        lastRestart: this.getLastRestartInfo(),
        lastError: this.getLastErrorInfo(),
      };

      // Determine overall health
      const criticalServicesDown = Object.values(status.services).some(
        (service: any) => service.status !== 'healthy',
      );

      const httpStatus = criticalServicesDown
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
      const overallStatus = criticalServicesDown ? 'degraded' : 'healthy';

      return res.status(httpStatus).json({
        ...status,
        status: overallStatus,
      });
    } catch (error) {
      console.error('❌ Status check failed:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
      });
    }
  }

  private getLastRestartInfo() {
    try {
      const restartLogPath = path.join(process.cwd(), 'restart-log.json');
      if (fs.existsSync(restartLogPath)) {
        const restartLog = JSON.parse(fs.readFileSync(restartLogPath, 'utf8'));
        return restartLog;
      }
    } catch (error) {
      console.warn('Could not read restart log:', error);
    }
    return null;
  }

  private getLastErrorInfo() {
    try {
      const errorLogPath = path.join(process.cwd(), 'last-error.json');
      if (fs.existsSync(errorLogPath)) {
        const errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf8'));
        return errorLog;
      }
    } catch (error) {
      console.warn('Could not read error log:', error);
    }
    return null;
  }
}

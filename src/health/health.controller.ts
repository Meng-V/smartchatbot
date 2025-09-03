import { Controller, Get, Post, HttpStatus, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { Role } from '../llm-chain/memory/memory.interface';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(private readonly databaseService: DatabaseService) {}

  private lastRateLimitLog: number | undefined;
  private restartAttempts: number = 0;
  private readonly maxRestartAttempts: number = 3;
  private lastRestartTime: number = 0;
  private readonly restartCooldown: number = 60000; // 1 minute cooldown between restarts

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
        // Log the critical service failure
        console.error(
          '🚨 Critical services are down:',
          Object.entries(healthData.services)
            .filter(
              ([, service]: [string, any]) => service.status !== 'healthy',
            )
            .map(
              ([name, service]: [string, any]) =>
                `${name}: ${service.error || 'unhealthy'}`,
            ),
        );

        // Trigger auto-restart if within limits and cooldown period
        await this.attemptAutoRestart(
          'critical_service_failure',
          `Services down: ${Object.entries(healthData.services)
            .filter(
              ([, service]: [string, any]) => service.status !== 'healthy',
            )
            .map(([name]) => name)
            .join(', ')}`,
        );

        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          ...healthData,
          status: 'degraded',
          autoRestart: {
            attempts: this.restartAttempts,
            maxAttempts: this.maxRestartAttempts,
            canRestart: this.canAttemptRestart(),
          },
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
      // Real database health check using Prisma
      // Simple database connectivity check - use a method that exists
      await this.databaseService.addMessageToDatabase(
        Role.AIAgent,
        'health-check',
        undefined,
      );
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
            : 'Database health check failed',
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

      // Test actual OpenAI API connection with a minimal request
      try {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 5000,
        });

        if (response.status === 200) {
          return { status: 'healthy' };
        }
      } catch (apiError: any) {
        // API key invalid, expired, or other critical issues
        if (apiError.response?.status === 401) {
          return {
            status: 'unhealthy',
            error: 'OpenAI API key is invalid or expired',
          };
        }
        if (apiError.response?.status === 403) {
          return {
            status: 'unhealthy',
            error: 'OpenAI API access forbidden',
          };
        }
        // For other errors, still mark as unhealthy but with different message
        return {
          status: 'unhealthy',
          error: `OpenAI API connection failed: ${apiError.message}`,
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
    apis?: any;
  }> {
    const apiResults = {
      googleCustomSearch: await this.checkGoogleCustomSearchApi(),
      libcalApi: await this.checkLibcalApi(),
    };

    // Determine overall status
    const hasUnhealthyApis = Object.values(apiResults).some(
      (api: any) => api.status !== 'healthy',
    );

    if (hasUnhealthyApis) {
      const unhealthyApis = Object.entries(apiResults)
        .filter(([, api]: [string, any]) => api.status !== 'healthy')
        .map(([name, api]: [string, any]) => `${name}: ${api.error}`)
        .join('; ');

      return {
        status: 'unhealthy',
        error: `APIs down: ${unhealthyApis}`,
        apis: apiResults,
        details: {
          unhealthyCount: Object.values(apiResults).filter(
            (api: any) => api.status !== 'healthy',
          ).length,
          totalCount: Object.keys(apiResults).length,
        },
      };
    }

    return {
      status: 'healthy',
      apis: apiResults,
      details: {
        allApisHealthy: true,
        totalCount: Object.keys(apiResults).length,
      },
    };
  }

  private async checkGoogleCustomSearchApi(): Promise<{
    status: string;
    error?: string;
    details?: any;
  }> {
    try {
      // Check if required environment variables are present
      if (
        !process.env.GOOGLE_API_KEY ||
        !process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID
      ) {
        return {
          status: 'unhealthy',
          error:
            'Missing credentials (GOOGLE_API_KEY or GOOGLE_LIBRARY_SEARCH_CSE_ID)',
          details: {
            missingApiKey: !process.env.GOOGLE_API_KEY,
            missingCseId: !process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID,
            apiName: 'Google Custom Search API',
          },
        };
      }

      // Skip actual API call during health checks to avoid rate limiting
      // Just validate credentials are present
      return {
        status: 'healthy',
        details: {
          apiName: 'Google Custom Search API',
          credentialsPresent: true,
          note: 'Credentials validated, API calls skipped to avoid rate limiting',
        },
      };
    } catch (error: any) {
      return this.handleApiError(error, 'Google Custom Search API');
    }
  }

  private async checkLibcalApi(): Promise<{
    status: string;
    error?: string;
    details?: any;
  }> {
    try {
      // Check if required environment variables are present
      if (!process.env.LIBCAL_CLIENT_ID || !process.env.LIBCAL_CLIENT_SECRET) {
        return {
          status: 'unhealthy',
          error:
            'Missing credentials (LIBCAL_CLIENT_ID or LIBCAL_CLIENT_SECRET)',
          details: {
            missingClientId: !process.env.LIBCAL_CLIENT_ID,
            missingClientSecret: !process.env.LIBCAL_CLIENT_SECRET,
            apiName: 'LibCal API',
          },
        };
      }

      // Test LibCal API token endpoint
      const tokenUrl = 'https://muohio.libcal.com/api/1.1/oauth/token';
      const response = await axios.post(
        tokenUrl,
        {
          client_id: process.env.LIBCAL_CLIENT_ID,
          client_secret: process.env.LIBCAL_CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        },
      );

      return {
        status: 'healthy',
        details: {
          apiName: 'LibCal API',
          responseStatus: response.status,
          tokenValid: !!response.data?.access_token,
        },
      };
    } catch (error: any) {
      return this.handleApiError(error, 'LibCal API');
    }
  }

  private handleApiError(
    error: any,
    apiName: string,
  ): {
    status: string;
    error: string;
    details: any;
  } {
    const criticalStatuses = [400, 401, 403, 500, 503];

    if (
      error.response?.status &&
      criticalStatuses.includes(error.response.status)
    ) {
      const statusMessages: { [key: number]: string } = {
        400: 'Bad Request - Invalid parameters',
        401: 'Unauthorized - Invalid credentials',
        403: 'Forbidden - Access denied',
        500: 'Internal Server Error',
        503: 'Service Unavailable',
      };

      return {
        status: 'unhealthy',
        error: `${error.response.status}: ${statusMessages[error.response.status]}`,
        details: {
          apiName,
          responseStatus: error.response.status,
          responseData: error.response.data,
          errorType: 'api_error',
        },
      };
    }

    // Handle network errors
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return {
        status: 'unhealthy',
        error: `Connection failed: ${error.message}`,
        details: {
          apiName,
          errorCode: error.code,
          errorType: 'connection_failure',
        },
      };
    }

    // For rate limiting (429), don't trigger restart
    if (error.response?.status === 429) {
      if (
        !this.lastRateLimitLog ||
        Date.now() - this.lastRateLimitLog > 300000
      ) {
        this.logger.log(
          `${apiName} rate limited (429) - suppressing logs for 5 minutes`,
        );
        this.lastRateLimitLog = Date.now();
      }
      return {
        status: 'healthy', // Don't restart for rate limiting
        error: `Rate limited: ${error.message}`,
        details: {
          apiName,
          errorType: 'rate_limited',
        },
      };
    }

    return {
      status: 'unhealthy',
      error: `Unknown error: ${error.message}`,
      details: {
        apiName,
        errorType: 'unknown_error',
      },
    };
  }

  @Post('restart')
  async triggerRestart(@Res() res: Response) {
    try {
      this.logger.log('🔄 Manual restart requested via /health/restart');

      // Reset auto-restart counter for manual restarts
      this.restartAttempts = 0;
      this.lastRestartTime = 0;

      // Log the restart request
      const restartLog = {
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short',
        }),
        trigger: 'manual_health_endpoint',
        reason: 'Manual restart requested',
        attempt: 'manual',
      };

      fs.writeFileSync(
        path.join(process.cwd(), 'restart-log.json'),
        JSON.stringify(restartLog, null, 2),
      );

      // Create restart flag
      fs.writeFileSync(
        path.join(process.cwd(), '.restart-flag'),
        `Manual restart at ${restartLog.timestamp}`,
      );

      res.status(HttpStatus.OK).json({
        status: 'restart_initiated',
        message: 'Server restart has been triggered',
        timestamp: restartLog.timestamp,
        type: 'manual',
      });

      // Trigger restart after sending response
      setTimeout(() => {
        this.logger.log('🚀 Starting SmartChatbot backend...');
        process.kill(process.pid, 'SIGTERM');

        // Fallback to force exit if SIGTERM doesn't work
        setTimeout(() => {
          this.logger.log('Force exiting...');
          process.exit(1);
        }, 3000);
      }, 1000);

      return; // Explicit return to satisfy TypeScript
    } catch (error) {
      this.logger.error('Failed to trigger restart:', error);
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
          externalApis: await this.checkExternalApisHealth(),
        },
        autoRestart: {
          attempts: this.restartAttempts,
          maxAttempts: this.maxRestartAttempts,
          canRestart: this.canAttemptRestart(),
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
      this.logger.error('Status check failed:', error);
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

  private canAttemptRestart(): boolean {
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;

    return (
      this.restartAttempts < this.maxRestartAttempts &&
      timeSinceLastRestart > this.restartCooldown
    );
  }

  private async attemptAutoRestart(
    trigger: string,
    reason: string,
  ): Promise<void> {
    if (!this.canAttemptRestart()) {
      if (this.restartAttempts >= this.maxRestartAttempts) {
        this.logger.error(
          `Auto-restart disabled: Maximum attempts (${this.maxRestartAttempts}) reached`,
        );
      } else {
        const remainingCooldown =
          this.restartCooldown - (Date.now() - this.lastRestartTime);
        this.logger.warn(
          `Auto-restart on cooldown: ${Math.ceil(remainingCooldown / 1000)}s remaining`,
        );
      }
      return;
    }

    this.restartAttempts++;
    this.lastRestartTime = Date.now();

    this.logger.log(
      `Auto-restart attempt ${this.restartAttempts}/${this.maxRestartAttempts} triggered by: ${trigger}`,
    );

    // Log the restart attempt
    const restartLog = {
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      }),
      trigger: `auto_restart_${trigger}`,
      reason: reason,
      attempt: this.restartAttempts,
      maxAttempts: this.maxRestartAttempts,
    };

    try {
      fs.writeFileSync(
        path.join(process.cwd(), 'restart-log.json'),
        JSON.stringify(restartLog, null, 2),
      );

      // Create restart flag for auto-restart.sh script
      fs.writeFileSync(
        path.join(process.cwd(), '.restart-flag'),
        `Auto-restart attempt ${this.restartAttempts}/${this.maxRestartAttempts} at ${restartLog.timestamp}`,
      );

      // Log error details for debugging
      const errorLog = {
        timestamp: restartLog.timestamp,
        trigger: trigger,
        reason: reason,
        attempt: this.restartAttempts,
        services: 'See health check for details',
      };

      fs.writeFileSync(
        path.join(process.cwd(), 'last-error.json'),
        JSON.stringify(errorLog, null, 2),
      );

      // Delay restart to allow current requests to complete
      setTimeout(() => {
        this.logger.log(
          `Executing auto-restart (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`,
        );
        process.kill(process.pid, 'SIGTERM');

        // Fallback force exit
        setTimeout(() => {
          this.logger.log('Force exiting...');
          process.exit(1);
        }, 3000);
      }, 2000);
    } catch (error) {
      this.logger.error('❌ Failed to execute auto-restart:', error);
    }
  }

  @Get('restart-status')
  async getRestartStatus(@Res() res: Response) {
    try {
      const status = {
        restartAttempts: this.restartAttempts,
        maxRestartAttempts: this.maxRestartAttempts,
        canRestart: this.canAttemptRestart(),
        lastRestartTime: this.lastRestartTime,
        cooldownRemaining: Math.max(
          0,
          this.restartCooldown - (Date.now() - this.lastRestartTime),
        ),
        lastRestart: this.getLastRestartInfo(),
        lastError: this.getLastErrorInfo(),
      };

      return res.status(HttpStatus.OK).json(status);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

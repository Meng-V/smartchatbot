import { Controller, Get, Post, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Controller('health')
export class HealthController {
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
        console.error('🚨 Critical services are down:', 
          Object.entries(healthData.services)
            .filter(([_, service]: [string, any]) => service.status !== 'healthy')
            .map(([name, service]: [string, any]) => `${name}: ${service.error || 'unhealthy'}`)
        );

        // Trigger auto-restart if within limits and cooldown period
        await this.attemptAutoRestart('critical_service_failure', 
          `Services down: ${Object.entries(healthData.services)
            .filter(([_, service]: [string, any]) => service.status !== 'healthy')
            .map(([name]) => name).join(', ')}`
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

      // Test actual OpenAI API connection with a minimal request
      try {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
  }> {
    try {
      // Check if required environment variables are present
      if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID) {
        return {
          status: 'unhealthy',
          error: 'Google API credentials not configured (missing GOOGLE_API_KEY or GOOGLE_LIBRARY_SEARCH_CSE_ID)',
          details: {
            missingApiKey: !process.env.GOOGLE_API_KEY,
            missingCseId: !process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID,
          },
        };
      }

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
      // Mark as unhealthy for any API errors that indicate configuration issues
      // This includes missing/invalid API keys, forbidden access, server errors
      const criticalStatuses = [400, 401, 403, 500, 503];
      
      if (error.response?.status && criticalStatuses.includes(error.response.status)) {
        const statusMessages: { [key: number]: string } = {
          400: 'Bad Request - Invalid API parameters',
          401: 'Unauthorized - Invalid API key',
          403: 'Forbidden - API access denied',
          500: 'Internal Server Error',
          503: 'Service Unavailable',
        };

        return {
          status: 'unhealthy',
          error: `External API returned ${error.response.status}: ${statusMessages[error.response.status] || error.response.data}`,
          details: {
            responseStatus: error.response.status,
            responseData: error.response.data,
          },
        };
      }

      // Handle network errors, timeouts, and connection failures as unhealthy
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          status: 'unhealthy',
          error: `External API connection failed: ${error.message}`,
          details: {
            errorCode: error.code,
            errorType: 'connection_failure',
          },
        };
      }

      // For rate limiting (429), don't trigger restart - it's expected behavior
      if (error.response?.status === 429) {
        if (
          !this.lastRateLimitLog ||
          Date.now() - this.lastRateLimitLog > 300000
        ) {
          console.log(
            'External API rate limited (429) - this is expected behavior (suppressing further logs for 5 minutes)',
          );
          this.lastRateLimitLog = Date.now();
        }
        return {
          status: 'healthy', // Don't restart for rate limiting
          error: `External API rate limited: ${error.message}`,
          details: {
            errorType: 'rate_limited',
          },
        };
      }

      // For any other errors, only log if it's actually an error (not rate limiting)
      if (error.response?.status !== 429) {
        console.warn('External API health check failed:', error.message);
      }
      return {
        status: 'unhealthy',
        error: `External API error: ${error.message}`,
        details: {
          errorType: 'unknown_error',
        },
      };
    }
  }

  @Post('restart')
  async triggerRestart(@Res() res: Response) {
    try {
      console.log('🔄 Manual restart triggered via health endpoint');

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
        console.log('🔄 Initiating manual restart...');
        process.kill(process.pid, 'SIGTERM');
        
        // Fallback to force exit if SIGTERM doesn't work
        setTimeout(() => {
          console.log('🔄 Force exiting...');
          process.exit(1);
        }, 3000);
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

  private canAttemptRestart(): boolean {
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;
    
    return this.restartAttempts < this.maxRestartAttempts && 
           timeSinceLastRestart > this.restartCooldown;
  }

  private async attemptAutoRestart(trigger: string, reason: string): Promise<void> {
    if (!this.canAttemptRestart()) {
      if (this.restartAttempts >= this.maxRestartAttempts) {
        console.error(`🚫 Auto-restart disabled: Maximum attempts (${this.maxRestartAttempts}) reached`);
      } else {
        const remainingCooldown = this.restartCooldown - (Date.now() - this.lastRestartTime);
        console.warn(`⏳ Auto-restart on cooldown: ${Math.ceil(remainingCooldown / 1000)}s remaining`);
      }
      return;
    }

    this.restartAttempts++;
    this.lastRestartTime = Date.now();

    console.log(`🔄 Auto-restart attempt ${this.restartAttempts}/${this.maxRestartAttempts} triggered by: ${trigger}`);

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
        console.log(`🔄 Executing auto-restart (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`);
        process.kill(process.pid, 'SIGTERM');
        
        // Fallback force exit
        setTimeout(() => {
          console.log('🔄 Force exiting...');
          process.exit(1);
        }, 3000);
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to execute auto-restart:', error);
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
        cooldownRemaining: Math.max(0, this.restartCooldown - (Date.now() - this.lastRestartTime)),
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

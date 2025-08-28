import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { WebSocketMemoryMonitorService } from '../gateway/websocket-memory-monitor.service';

@ApiTags('health')
@Controller('readiness')
export class ReadinessController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly memoryMonitor: WebSocketMemoryMonitorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes/Docker' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async checkReadiness() {
    const checks = [];
    let allHealthy = true;

    // Database connectivity check
    try {
      const start = Date.now();
      await this.databaseService.healthCheck();
      checks.push({
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - start,
      });
    } catch (error) {
      allHealthy = false;
      checks.push({
        name: 'database',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Memory usage check
    const memStats = this.memoryMonitor.getMemoryStats();
    const memoryHealthy = memStats.heapUsedMB < 512; // 512MB threshold
    checks.push({
      name: 'memory',
      status: memoryHealthy ? 'healthy' : 'unhealthy',
      heapUsedMB: memStats.heapUsedMB,
      connectionCount: memStats.connectionCount,
    });

    if (!memoryHealthy) {
      allHealthy = false;
    }

    // Environment variables check
    const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'FRONTEND_URL'];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );
    const envHealthy = missingEnvVars.length === 0;

    checks.push({
      name: 'environment',
      status: envHealthy ? 'healthy' : 'unhealthy',
      missingVariables: missingEnvVars,
    });

    if (!envHealthy) {
      allHealthy = false;
    }

    const result = {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!allHealthy) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}

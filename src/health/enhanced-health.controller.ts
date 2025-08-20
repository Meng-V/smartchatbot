import { Controller, Get, Post, HttpCode, HttpStatus, Inject, Query } from '@nestjs/common';
import { ErrorMonitoringService } from '../shared/services/error-monitoring/error-monitoring.service';
import { PerformanceMonitoringService } from '../shared/services/performance-monitoring/performance-monitoring.service';
import { ApiResilienceService } from '../shared/services/api-resilience/api-resilience.service';

@Controller('health')
export class EnhancedHealthController {
  constructor(
    private errorMonitoringService: ErrorMonitoringService,
    private performanceMonitoringService: PerformanceMonitoringService,
    private apiResilienceService: ApiResilienceService,
  ) {}

  @Get()
  getHealth() {
    const systemHealth = this.performanceMonitoringService.getSystemHealth();
    const errorHealth = this.errorMonitoringService.getHealthStatus();
    const circuitBreakerStatus = this.apiResilienceService.getCircuitBreakerStatus();
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (systemHealth.status === 'critical' || errorHealth.status === 'degraded') {
      overallStatus = 'critical';
    } else if (systemHealth.status === 'warning' || errorHealth.status === 'warning') {
      overallStatus = 'warning';
    }

    // Check for open circuit breakers
    const openCircuitBreakers = Object.entries(circuitBreakerStatus)
      .filter(([, stats]) => stats.state === 'OPEN')
      .map(([name]) => name);

    if (openCircuitBreakers.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        performance: systemHealth,
        errors: errorHealth,
        circuitBreakers: {
          status: openCircuitBreakers.length === 0 ? 'healthy' : 'degraded',
          openBreakers: openCircuitBreakers,
          totalBreakers: Object.keys(circuitBreakerStatus).length
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };
  }

  @Get('detailed')
  getDetailedHealth(@Query('timeWindow') timeWindow?: string) {
    const timeWindowMs = timeWindow ? parseInt(timeWindow) : 3600000; // Default 1 hour
    
    const performanceStats = this.performanceMonitoringService.getPerformanceStats(timeWindowMs);
    const errorStats = this.errorMonitoringService.getErrorStats(timeWindowMs);
    const circuitBreakerStatus = this.apiResilienceService.getCircuitBreakerStatus();
    const rateLimitStatus = this.performanceMonitoringService.getRateLimitStatus();

    return {
      timestamp: new Date().toISOString(),
      timeWindow: `${timeWindowMs / 1000} seconds`,
      performance: performanceStats,
      errors: errorStats,
      circuitBreakers: circuitBreakerStatus,
      rateLimits: rateLimitStatus,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      }
    };
  }

  @Get('errors')
  getErrors(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 100;

    if (search) {
      return this.errorMonitoringService.searchErrors(search, limitNum);
    }

    if (category) {
      return this.errorMonitoringService.getErrorsByCategory(category, limitNum);
    }

    return this.errorMonitoringService.getErrorStats().recentErrors;
  }

  @Get('performance')
  getPerformance(
    @Query('operation') operation?: string,
    @Query('timeWindow') timeWindow?: string
  ) {
    const timeWindowMs = timeWindow ? parseInt(timeWindow) : 3600000;

    if (operation) {
      return this.performanceMonitoringService.getOperationMetrics(operation);
    }

    return {
      stats: this.performanceMonitoringService.getPerformanceStats(timeWindowMs),
      slowest: this.performanceMonitoringService.getSlowestOperations(timeWindowMs),
      failed: this.performanceMonitoringService.getFailedOperations(timeWindowMs, 20)
    };
  }

  @Get('circuit-breakers')
  getCircuitBreakers() {
    return this.apiResilienceService.getCircuitBreakerStatus();
  }

  @Post('circuit-breakers/:name/reset')
  @HttpCode(HttpStatus.OK)
  resetCircuitBreaker(@Query('name') name: string) {
    this.apiResilienceService.resetCircuitBreaker(name);
    return { message: `Circuit breaker ${name} has been reset` };
  }

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  async triggerRestart() {
    // Log the manual restart request
    this.errorMonitoringService.logError(
      'manual-restart',
      'Manual restart requested via health endpoint',
      'info',
      { source: 'health-endpoint', timestamp: new Date().toISOString() }
    );

    // Create restart flag for auto-restart script detection
    const fs = require('fs');
    const path = require('path');
    const restartFlagPath = path.join(process.cwd(), '.health-restart-flag');
    
    fs.writeFileSync(restartFlagPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      reason: 'Manual restart via health endpoint',
      pid: process.pid
    }));

    // Graceful shutdown
    setTimeout(() => {
      process.kill(process.pid, 'SIGTERM');
    }, 1000);

    return {
      message: 'Server restart initiated',
      timestamp: new Date().toISOString(),
      expectedDowntime: '< 15 seconds'
    };
  }

  @Get('export')
  exportData(
    @Query('type') type: 'errors' | 'performance' | 'all' = 'all',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const result: any = {
      exportTimestamp: new Date().toISOString(),
      dateRange: {
        start: start?.toISOString(),
        end: end?.toISOString()
      }
    };

    if (type === 'errors' || type === 'all') {
      result.errors = this.errorMonitoringService.exportErrors(start, end);
    }

    if (type === 'performance' || type === 'all') {
      result.performance = this.performanceMonitoringService.exportMetrics(start, end);
    }

    return result;
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebSocketMemoryMonitorService } from '../gateway/websocket-memory-monitor.service';
import { DatabaseService } from '../database/database.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly memoryMonitor: WebSocketMemoryMonitorService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application metrics for monitoring' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  async getMetrics() {
    const memoryStats = this.memoryMonitor.getMemoryStats();
    const memUsage = process.memoryUsage();

    // Get database stats
    let dbStats = { healthy: false, responseTime: 0 };
    try {
      const start = Date.now();
      await this.databaseService.healthCheck();
      dbStats = { healthy: true, responseTime: Date.now() - start };
    } catch {
      dbStats = { healthy: false, responseTime: -1 };
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      websockets: {
        activeConnections: memoryStats.connectionCount,
      },
      database: dbStats,
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  @Get('prometheus')
  @ApiOperation({ summary: 'Get metrics in Prometheus format' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics', type: String })
  async getPrometheusMetrics(): Promise<string> {
    const memoryStats = this.memoryMonitor.getMemoryStats();
    const memUsage = process.memoryUsage();

    let dbHealthy = 0;
    try {
      await this.databaseService.healthCheck();
      dbHealthy = 1;
    } catch {
      dbHealthy = 0;
    }

    const metrics = [
      `# HELP smartchatbot_memory_heap_used_bytes Memory heap used in bytes`,
      `# TYPE smartchatbot_memory_heap_used_bytes gauge`,
      `smartchatbot_memory_heap_used_bytes ${memUsage.heapUsed}`,
      ``,
      `# HELP smartchatbot_websocket_connections Active WebSocket connections`,
      `# TYPE smartchatbot_websocket_connections gauge`,
      `smartchatbot_websocket_connections ${memoryStats.connectionCount}`,
      ``,
      `# HELP smartchatbot_database_healthy Database health status (1=healthy, 0=unhealthy)`,
      `# TYPE smartchatbot_database_healthy gauge`,
      `smartchatbot_database_healthy ${dbHealthy}`,
      ``,
      `# HELP smartchatbot_uptime_seconds Application uptime in seconds`,
      `# TYPE smartchatbot_uptime_seconds counter`,
      `smartchatbot_uptime_seconds ${process.uptime()}`,
    ];

    return metrics.join('\n');
  }
}

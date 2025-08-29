import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WebSocketMemoryMonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(WebSocketMemoryMonitorService.name);
  private readonly MAX_CONNECTIONS = 1000;
  private readonly MAX_MEMORY_MB = 512;
  private connectionCount = 0;
  private lastMemoryCheck = 0;

  incrementConnection(): void {
    this.connectionCount++;
    if (this.connectionCount > this.MAX_CONNECTIONS) {
      this.logger.warn(
        `High connection count: ${this.connectionCount}/${this.MAX_CONNECTIONS}`,
      );
    }
  }

  decrementConnection(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    this.lastMemoryCheck = heapUsedMB;

    if (heapUsedMB > this.MAX_MEMORY_MB) {
      this.logger.warn(
        `High memory usage: ${heapUsedMB}MB/${this.MAX_MEMORY_MB}MB (${this.connectionCount} connections)`,
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.logger.log('Forced garbage collection');
      }
    }

    // Log memory stats every 5 minutes
    if (Date.now() % 300000 < 30000) {
      this.logger.log(
        `Memory: ${heapUsedMB}MB used, ${heapTotalMB}MB total, ${this.connectionCount} connections`,
      );
    }
  }

  getMemoryStats(): { heapUsedMB: number; connectionCount: number } {
    return {
      heapUsedMB: this.lastMemoryCheck,
      connectionCount: this.connectionCount,
    };
  }

  onModuleDestroy(): void {
    this.logger.log('WebSocket memory monitor shutting down');
  }
}

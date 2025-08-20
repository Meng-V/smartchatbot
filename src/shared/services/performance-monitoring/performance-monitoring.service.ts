import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetric {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
}

export interface PerformanceStats {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  requestsPerMinute: number;
  slowestOperations: Array<{ operation: string; avgDuration: number; count: number }>;
  errorRate: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private metrics: PerformanceMetric[] = [];
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private readonly maxStoredMetrics = 10000;

  constructor() {
    this.startPeriodicCleanup();
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): () => void {
    const startTime = Date.now();
    
    return (success: boolean = true, errorMessage?: string) => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, success, errorMessage, metadata);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    operation: string,
    duration: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      errorMessage,
      metadata
    };

    this.metrics.push(metric);

    // Maintain max stored metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }

    // Log slow operations
    if (duration > 10000) { // 10 seconds
      this.logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    // Log failed operations
    if (!success) {
      this.logger.error(`Operation failed: ${operation} - ${errorMessage}`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeWindowMs: number = 3600000): PerformanceStats { // Default 1 hour
    const now = Date.now();
    const cutoffTime = now - timeWindowMs;
    
    const recentMetrics = this.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        successRate: 100,
        requestsPerMinute: 0,
        slowestOperations: [],
        errorRate: 0
      };
    }

    // Calculate response time statistics
    const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95ResponseTime = durations[p95Index] || 0;
    const p99ResponseTime = durations[p99Index] || 0;

    // Calculate success rate
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const successRate = (successfulRequests / recentMetrics.length) * 100;

    // Calculate requests per minute
    const requestsPerMinute = (recentMetrics.length / (timeWindowMs / 60000));

    // Calculate error rate
    const errorRate = ((recentMetrics.length - successfulRequests) / recentMetrics.length) * 100;

    // Find slowest operations
    const operationStats: Record<string, { totalDuration: number; count: number }> = {};
    
    recentMetrics.forEach(metric => {
      if (!operationStats[metric.operation]) {
        operationStats[metric.operation] = { totalDuration: 0, count: 0 };
      }
      operationStats[metric.operation].totalDuration += metric.duration;
      operationStats[metric.operation].count++;
    });

    const slowestOperations = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      successRate,
      requestsPerMinute,
      slowestOperations,
      errorRate
    };
  }

  /**
   * Check rate limit for a key
   */
  checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    // If no entry or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      this.rateLimitStore.set(key, newEntry);
      
      return {
        allowed: true,
        resetTime: newEntry.resetTime,
        remaining: config.maxRequests - 1
      };
    }

    // Increment count
    entry.count++;

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for key: ${key} (${entry.count}/${config.maxRequests})`);
    }

    return {
      allowed,
      resetTime: entry.resetTime,
      remaining
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(metric => metric.operation === operation)
      .slice(-limit);
  }

  /**
   * Get slowest operations in time window
   */
  getSlowestOperations(timeWindowMs: number = 3600000, limit: number = 10): Array<{ operation: string; duration: number; timestamp: string }> {
    const now = Date.now();
    const cutoffTime = now - timeWindowMs;
    
    return this.metrics
      .filter(metric => new Date(metric.timestamp).getTime() > cutoffTime)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(metric => ({
        operation: metric.operation,
        duration: metric.duration,
        timestamp: metric.timestamp
      }));
  }

  /**
   * Get failed operations in time window
   */
  getFailedOperations(timeWindowMs: number = 3600000, limit: number = 100): PerformanceMetric[] {
    const now = Date.now();
    const cutoffTime = now - timeWindowMs;
    
    return this.metrics
      .filter(metric => 
        !metric.success && 
        new Date(metric.timestamp).getTime() > cutoffTime
      )
      .slice(-limit);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanMs: number = 86400000): number { // Default 24 hours
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );
    
    const removedCount = initialCount - this.metrics.length;
    
    if (removedCount > 0) {
      this.logger.log(`Cleared ${removedCount} old performance metrics`);
    }
    
    return removedCount;
  }

  /**
   * Clear expired rate limit entries
   */
  clearExpiredRateLimits(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimitStore.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.logger.debug(`Cleared ${removedCount} expired rate limit entries`);
    }
    
    return removedCount;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): Array<{ key: string; count: number; resetTime: number; remaining: number }> {
    const now = Date.now();
    const status: Array<{ key: string; count: number; resetTime: number; remaining: number }> = [];
    
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now < entry.resetTime) {
        status.push({
          key,
          count: entry.count,
          resetTime: entry.resetTime,
          remaining: Math.max(0, 100 - entry.count) // Assuming default max of 100
        });
      }
    }
    
    return status;
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.clearOldMetrics();
      this.clearExpiredRateLimits();
    }, 3600000);
  }

  /**
   * Get system health based on performance metrics
   */
  getSystemHealth(): { status: 'healthy' | 'warning' | 'critical'; metrics: PerformanceStats } {
    const stats = this.getPerformanceStats(300000); // Last 5 minutes
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Determine status based on metrics
    if (stats.errorRate > 10 || stats.averageResponseTime > 10000 || stats.successRate < 90) {
      status = 'critical';
    } else if (stats.errorRate > 5 || stats.averageResponseTime > 5000 || stats.successRate < 95) {
      status = 'warning';
    }
    
    return { status, metrics: stats };
  }

  /**
   * Export performance data
   */
  exportMetrics(startDate?: Date, endDate?: Date): PerformanceMetric[] {
    let filteredMetrics = this.metrics;
    
    if (startDate) {
      filteredMetrics = filteredMetrics.filter(
        metric => new Date(metric.timestamp) >= startDate
      );
    }
    
    if (endDate) {
      filteredMetrics = filteredMetrics.filter(
        metric => new Date(metric.timestamp) <= endDate
      );
    }
    
    return filteredMetrics;
  }
}

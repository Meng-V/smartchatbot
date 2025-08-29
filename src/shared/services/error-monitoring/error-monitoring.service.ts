import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  category: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByLevel: Record<string, number>;
  recentErrors: ErrorEvent[];
  errorRate: number; // errors per minute
  topErrors: Array<{ message: string; count: number }>;
}

export interface AlertConfig {
  errorRateThreshold: number; // errors per minute
  criticalErrorThreshold: number; // critical errors in time window
  timeWindowMs: number;
  alertCooldownMs: number;
}

@Injectable()
export class ErrorMonitoringService {
  private readonly logger = new Logger(ErrorMonitoringService.name);
  private errors: ErrorEvent[] = [];
  private readonly maxStoredErrors = 1000;
  private readonly errorLogPath = path.join(
    process.cwd(),
    'logs',
    'error-monitoring.json',
  );
  private lastAlertTime = 0;

  private readonly defaultAlertConfig: AlertConfig = {
    errorRateThreshold: 10, // 10 errors per minute
    criticalErrorThreshold: 5, // 5 critical errors in 5 minutes
    timeWindowMs: 300000, // 5 minutes
    alertCooldownMs: 600000, // 10 minutes between alerts
  };

  constructor() {
    this.ensureLogDirectory();
    this.loadPersistedErrors();
    this.startPeriodicCleanup();
  }

  /**
   * Log an error event
   */
  logError(
    category: string,
    message: string,
    level: 'error' | 'warn' | 'info' = 'error',
    context?: Record<string, any>,
    stack?: string,
    userId?: string,
    sessionId?: string,
    userAgent?: string,
    ip?: string,
  ): string {
    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      stack,
      context,
      userId,
      sessionId,
      userAgent,
      ip,
    };

    this.errors.push(errorEvent);

    // Maintain max stored errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }

    // Log to console based on level
    switch (level) {
      case 'error':
        this.logger.error(`[${category}] ${message}`, stack);
        break;
      case 'warn':
        this.logger.warn(`[${category}] ${message}`);
        break;
      case 'info':
        this.logger.log(`[${category}] ${message}`);
        break;
    }

    // Persist error for future analysis
    this.persistError(errorEvent);

    // Check for alert conditions
    this.checkAlerts();

    // Check if we need to trigger automatic restart
    this.checkAutoRestart(errorEvent);

    return errorEvent.id;
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindowMs: number = 3600000): ErrorStats {
    // Default 1 hour
    const now = Date.now();
    const cutoffTime = now - timeWindowMs;

    const recentErrors = this.errors.filter(
      (error) => new Date(error.timestamp).getTime() > cutoffTime,
    );

    const errorsByCategory: Record<string, number> = {};
    const errorsByLevel: Record<string, number> = {};
    const errorCounts: Record<string, number> = {};

    recentErrors.forEach((error) => {
      // Count by category
      errorsByCategory[error.category] =
        (errorsByCategory[error.category] || 0) + 1;

      // Count by level
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1;

      // Count by message for top errors
      errorCounts[error.message] = (errorCounts[error.message] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    const errorRate = recentErrors.length / (timeWindowMs / 60000); // errors per minute

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsByLevel,
      recentErrors: recentErrors.slice(-50), // Last 50 errors
      errorRate,
      topErrors,
    };
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: string, limit: number = 100): ErrorEvent[] {
    return this.errors
      .filter((error) => error.category === category)
      .slice(-limit);
  }

  /**
   * Get errors by user
   */
  getErrorsByUser(userId: string, limit: number = 100): ErrorEvent[] {
    return this.errors.filter((error) => error.userId === userId).slice(-limit);
  }

  /**
   * Search errors
   */
  searchErrors(query: string, limit: number = 100): ErrorEvent[] {
    const lowerQuery = query.toLowerCase();
    return this.errors
      .filter(
        (error) =>
          error.message.toLowerCase().includes(lowerQuery) ||
          error.category.toLowerCase().includes(lowerQuery) ||
          (error.stack && error.stack.toLowerCase().includes(lowerQuery)),
      )
      .slice(-limit);
  }

  /**
   * Clear old errors
   */
  clearOldErrors(olderThanMs: number = 2592000000): number {
    // Default 30 days
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.errors.length;

    this.errors = this.errors.filter(
      (error) => new Date(error.timestamp).getTime() > cutoffTime,
    );

    const removedCount = initialCount - this.errors.length;

    if (removedCount > 0) {
      this.logger.log(`Cleared ${removedCount} old error records`);
    }

    return removedCount;
  }

  /**
   * Export errors to JSON
   */
  exportErrors(startDate?: Date, endDate?: Date): ErrorEvent[] {
    let filteredErrors = this.errors;

    if (startDate) {
      filteredErrors = filteredErrors.filter(
        (error) => new Date(error.timestamp) >= startDate,
      );
    }

    if (endDate) {
      filteredErrors = filteredErrors.filter(
        (error) => new Date(error.timestamp) <= endDate,
      );
    }

    return filteredErrors;
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(config: AlertConfig = this.defaultAlertConfig): void {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastAlertTime < config.alertCooldownMs) {
      return;
    }

    const cutoffTime = now - config.timeWindowMs;
    const recentErrors = this.errors.filter(
      (error) => new Date(error.timestamp).getTime() > cutoffTime,
    );

    const errorRate = recentErrors.length / (config.timeWindowMs / 60000);
    const criticalErrors = recentErrors.filter(
      (error) => error.level === 'error',
    ).length;

    let shouldAlert = false;
    let alertMessage = '';

    if (errorRate > config.errorRateThreshold) {
      shouldAlert = true;
      alertMessage += `High error rate: ${errorRate.toFixed(2)} errors/min (threshold: ${config.errorRateThreshold}). `;
    }

    if (criticalErrors > config.criticalErrorThreshold) {
      shouldAlert = true;
      alertMessage += `High critical error count: ${criticalErrors} errors in ${config.timeWindowMs / 60000} minutes (threshold: ${config.criticalErrorThreshold}). `;
    }

    if (shouldAlert) {
      this.triggerAlert(alertMessage, recentErrors);
      this.lastAlertTime = now;
    }
  }

  /**
   * Trigger alert (can be extended to send emails, Slack notifications, etc.)
   */
  private triggerAlert(message: string, recentErrors: ErrorEvent[]): void {
    this.logger.error(`🚨 ALERT: ${message}`);

    // Log alert details
    const alertDetails = {
      timestamp: new Date().toISOString(),
      message,
      errorCount: recentErrors.length,
      topCategories: this.getTopCategories(recentErrors, 5),
      recentErrorSample: recentErrors.slice(-5),
    };

    // Write alert to separate file
    const alertPath = path.join(process.cwd(), 'logs', 'alerts.json');
    this.appendToFile(alertPath, alertDetails);

    // TODO: Implement external alerting (email, Slack, etc.)
    // this.sendEmailAlert(alertDetails);
    // this.sendSlackAlert(alertDetails);
  }

  /**
   * Get top error categories
   */
  private getTopCategories(
    errors: ErrorEvent[],
    limit: number,
  ): Array<{ category: string; count: number }> {
    const categoryCounts: Record<string, number> = {};

    errors.forEach((error) => {
      categoryCounts[error.category] =
        (categoryCounts[error.category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.errorLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Persist error to file
   */
  private persistError(error: ErrorEvent): void {
    this.appendToFile(this.errorLogPath, error);
  }

  /**
   * Append data to file
   */
  private appendToFile(filePath: string, data: any): void {
    try {
      const logEntry = JSON.stringify(data) + '\n';
      fs.appendFileSync(filePath, logEntry);
    } catch (error) {
      this.logger.error('Failed to write to log file:', error);
    }
  }

  /**
   * Load persisted errors on startup
   */
  private loadPersistedErrors(): void {
    try {
      if (fs.existsSync(this.errorLogPath)) {
        const content = fs.readFileSync(this.errorLogPath, 'utf8');
        const lines = content
          .trim()
          .split('\n')
          .filter((line) => line.trim());

        // Load last 500 errors from file
        const recentLines = lines.slice(-500);

        recentLines.forEach((line) => {
          try {
            const error = JSON.parse(line);
            this.errors.push(error);
          } catch (parseError) {
            this.logger.warn('Failed to parse persisted error:', parseError);
          }
        });

        this.logger.log(`Loaded ${this.errors.length} persisted errors`);
      }
    } catch (error) {
      this.logger.error('Failed to load persisted errors:', error);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean up old errors every hour
    setInterval(() => {
      this.clearOldErrors();
    }, 3600000);
  }

  /**
   * Get recent errors within specified time window
   */
  private getRecentErrors(timeWindowMs: number): ErrorEvent[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return this.errors.filter(
      (error) => new Date(error.timestamp) >= cutoffTime,
    );
  }

  /**
   * Check if automatic restart should be triggered based on error conditions
   */
  private checkAutoRestart(errorEvent: ErrorEvent): void {
    // Define conditions that should trigger automatic restart
    const shouldRestart =
      // Critical errors in chat gateway or core services
      (errorEvent.level === 'error' &&
        (errorEvent.category.includes('chat-gateway') ||
          errorEvent.category.includes('database') ||
          errorEvent.category.includes('llm-service'))) ||
      // Multiple API failures in short time
      this.hasMultipleApiFailures() ||
      // High error rate threshold exceeded
      this.isErrorRateExceeded();

    if (shouldRestart) {
      this.logger.error('🔄 Auto-restart triggered due to critical errors', {
        triggerError: errorEvent,
        errorRate: this.getErrorStats(300000).errorRate,
      });

      // Trigger restart with delay to allow current operations to complete
      setTimeout(() => {
        this.triggerServerRestart('Critical error conditions detected');
      }, 5000);
    }
  }

  /**
   * Check if there are multiple API failures in recent time
   */
  private hasMultipleApiFailures(): boolean {
    const recentErrors = this.getRecentErrors(300000); // Last 5 minutes
    const apiErrors = recentErrors.filter(
      (error: ErrorEvent) =>
        error.category.includes('api') ||
        error.category.includes('third-party') ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('connection'),
    );

    return apiErrors.length >= 5; // 5 API failures in 5 minutes
  }

  /**
   * Check if error rate exceeds critical threshold
   */
  private isErrorRateExceeded(): boolean {
    const stats = this.getErrorStats(300000); // Last 5 minutes
    return stats.errorRate > 15; // More than 15 errors per minute
  }

  /**
   * Trigger server restart
   */
  private triggerServerRestart(reason: string): void {
    this.logger.error(`🚨 TRIGGERING SERVER RESTART: ${reason}`);

    // Write restart flag for monitoring
    const restartFlagPath = path.join(process.cwd(), '.restart-flag');

    try {
      fs.writeFileSync(
        restartFlagPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          reason,
          triggeredBy: 'ErrorMonitoringService',
        }),
      );

      // Exit with code 1 to trigger restart
      process.exit(1);
    } catch (error) {
      this.logger.error('Failed to write restart flag:', error);
      process.exit(1);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: string;
    errorRate: number;
    recentErrors: number;
  } {
    const recentErrors = this.getRecentErrors(300000); // Last 5 minutes
    const errorRate = (recentErrors.length / 5) * 60; // Errors per minute

    let status = 'healthy';
    if (errorRate > 10) {
      status = 'critical';
    } else if (errorRate > 5) {
      status = 'degraded';
    }

    return {
      status,
      errorRate,
      recentErrors: recentErrors.length,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringPeriodMs: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  totalRequests: number;
}

@Injectable()
export class ApiResilienceService {
  private readonly logger = new Logger(ApiResilienceService.name);
  private circuitBreakers = new Map<string, CircuitBreakerStats>();

  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    timeoutMs: 30000,
  };

  private readonly defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000, // 1 minute
    monitoringPeriodMs: 300000, // 5 minutes
  };

  /**
   * Execute a function with retry logic and circuit breaker protection
   */
  async executeWithResilience<T>(
    operationName: string,
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const cbConfig = {
      ...this.defaultCircuitBreakerConfig,
      ...circuitBreakerConfig,
    };

    // Check circuit breaker
    if (this.isCircuitOpen(operationName, cbConfig)) {
      const error = new Error(`Circuit breaker is OPEN for ${operationName}`);
      this.logger.warn(`Circuit breaker prevented execution: ${operationName}`);
      throw error;
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing ${operationName} - attempt ${attempt}/${config.maxAttempts}`,
        );

        // Execute with timeout
        const result = await this.executeWithTimeout(
          operation,
          config.timeoutMs,
        );

        // Record success
        this.recordSuccess(operationName);

        if (attempt > 1) {
          this.logger.log(`${operationName} succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(operationName, cbConfig);

        this.logger.warn(
          `${operationName} failed on attempt ${attempt}: ${lastError.message}`,
        );

        // Don't retry if circuit breaker is now open
        if (this.isCircuitOpen(operationName, cbConfig)) {
          this.logger.warn(
            `Circuit breaker opened for ${operationName} after failure`,
          );
          break;
        }

        // Don't delay after the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          this.logger.debug(`Retrying ${operationName} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    const finalError =
      lastError ||
      new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
    this.logger.error(
      `${operationName} failed after ${config.maxAttempts} attempts: ${finalError.message}`,
    );
    throw finalError;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(
    operationName: string,
    config: CircuitBreakerConfig,
  ): boolean {
    const stats = this.getCircuitBreakerStats(operationName);

    switch (stats.state) {
      case CircuitBreakerState.CLOSED:
        return false;

      case CircuitBreakerState.OPEN:
        // Check if recovery timeout has passed
        if (Date.now() - stats.lastFailureTime > config.recoveryTimeoutMs) {
          stats.state = CircuitBreakerState.HALF_OPEN;
          this.logger.log(
            `Circuit breaker for ${operationName} moved to HALF_OPEN`,
          );
          return false;
        }
        return true;

      case CircuitBreakerState.HALF_OPEN:
        return false;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(operationName: string): void {
    const stats = this.getCircuitBreakerStats(operationName);
    stats.successCount++;
    stats.totalRequests++;

    if (stats.state === CircuitBreakerState.HALF_OPEN) {
      // Reset circuit breaker on success in half-open state
      stats.state = CircuitBreakerState.CLOSED;
      stats.failureCount = 0;
      this.logger.log(`Circuit breaker for ${operationName} reset to CLOSED`);
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(
    operationName: string,
    config: CircuitBreakerConfig,
  ): void {
    const stats = this.getCircuitBreakerStats(operationName);
    stats.failureCount++;
    stats.totalRequests++;
    stats.lastFailureTime = Date.now();

    if (stats.failureCount >= config.failureThreshold) {
      stats.state = CircuitBreakerState.OPEN;
      this.logger.warn(
        `Circuit breaker for ${operationName} opened after ${stats.failureCount} failures`,
      );
    }
  }

  /**
   * Get or create circuit breaker stats
   */
  private getCircuitBreakerStats(operationName: string): CircuitBreakerStats {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        totalRequests: 0,
      });
    }
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay =
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerStats> {
    const status: Record<string, CircuitBreakerStats> = {};
    this.circuitBreakers.forEach((stats, name) => {
      status[name] = { ...stats };
    });
    return status;
  }

  /**
   * Reset circuit breaker for a specific operation
   */
  resetCircuitBreaker(operationName: string): void {
    if (this.circuitBreakers.has(operationName)) {
      const stats = this.circuitBreakers.get(operationName)!;
      stats.state = CircuitBreakerState.CLOSED;
      stats.failureCount = 0;
      stats.lastFailureTime = 0;
      this.logger.log(`Circuit breaker for ${operationName} manually reset`);
    }
  }
}

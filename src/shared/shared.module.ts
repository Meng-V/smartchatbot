import { Module } from '@nestjs/common';
import { RetrieveEnvironmentVariablesService } from './services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ConfigModule } from '@nestjs/config';
import { NetworkService } from './services/network/network.service';
import { TokenUsageService } from './services/token-usage/token-usage.service';
import { ApiResilienceService } from './services/api-resilience/api-resilience.service';
import { ErrorMonitoringService } from './services/error-monitoring/error-monitoring.service';
import { PerformanceMonitoringService } from './services/performance-monitoring/performance-monitoring.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  providers: [
    RetrieveEnvironmentVariablesService,
    NetworkService,
    TokenUsageService,
    ApiResilienceService,
    ErrorMonitoringService,
    PerformanceMonitoringService,
  ],
  exports: [
    RetrieveEnvironmentVariablesService,
    NetworkService,
    TokenUsageService,
    ApiResilienceService,
    ErrorMonitoringService,
    PerformanceMonitoringService,
  ],
})
export class SharedModule {}

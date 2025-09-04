import { Module } from '@nestjs/common';
import { RetrieveEnvironmentVariablesService } from './services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ConfigModule } from '@nestjs/config';
import { NetworkService } from './services/network/network.service';
import { TokenUsageService } from './services/token-usage/token-usage.service';
import { ApiResilienceService } from './services/api-resilience/api-resilience.service';
import { ErrorMonitoringService } from './services/error-monitoring/error-monitoring.service';
import { PerformanceMonitoringService } from './services/performance-monitoring/performance-monitoring.service';
import { DatabaseCleanupService } from './services/database-cleanup/database-cleanup.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    DatabaseModule,
  ],
  providers: [
    RetrieveEnvironmentVariablesService,
    NetworkService,
    TokenUsageService,
    ApiResilienceService,
    ErrorMonitoringService,
    PerformanceMonitoringService,
    DatabaseCleanupService,
  ],
  exports: [
    RetrieveEnvironmentVariablesService,
    NetworkService,
    TokenUsageService,
    ApiResilienceService,
    ErrorMonitoringService,
    PerformanceMonitoringService,
    DatabaseCleanupService,
  ],
})
export class SharedModule {}

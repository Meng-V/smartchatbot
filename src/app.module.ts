import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { GatewayModule } from './gateway/gateway.module';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './health/metrics.controller';
import { ReadinessController } from './health/readiness.controller';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    GatewayModule,
    LlmChainModule,
    SharedModule,
  ],
  controllers: [HealthController, MetricsController, ReadinessController],
  providers: [],
})
export class AppModule {}

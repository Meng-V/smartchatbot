import { Module } from '@nestjs/common';
import { RetrieveEnvironmentVariablesService } from './services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ConfigModule } from '@nestjs/config';
import { NetworkService } from './services/network/network.service';
import { TokenUsageService } from './services/token-usage/token-usage.service';

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
  ],
  exports: [
    RetrieveEnvironmentVariablesService,
    NetworkService,
    TokenUsageService,
  ],
})
export class SharedModule {}

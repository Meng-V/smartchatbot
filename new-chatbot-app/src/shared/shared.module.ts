import { Module } from '@nestjs/common';
import { NetworkService } from './services/network/network.service';
import { TokenUsageService } from './services/token-usage/token-usage.service';
import { RetrieveEnvironmentVariablesService } from './services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    NetworkService,
    TokenUsageService,
    RetrieveEnvironmentVariablesService,
    ConfigService,
  ],
  exports: [
    NetworkService,
    TokenUsageService,
    RetrieveEnvironmentVariablesService,
  ],
})
export class SharedModule {}

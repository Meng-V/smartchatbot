import { Module } from '@nestjs/common';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { LibraryApiModule } from './library-api/library-api.module';
import { ConfigModule } from '@nestjs/config';
import { RetrieveEnvironmentVariablesService } from './shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ChatGateway } from './chat/chat.gateway';
import { NetworkService } from './shared/services/network/network.service';

import { TokenUsageService } from './shared/services/token-usage/token-usage.service';

@Module({
  imports: [ConfigModule.forRoot(), LlmChainModule, LibraryApiModule],
  providers: [
    RetrieveEnvironmentVariablesService,
    ChatGateway,
    NetworkService,
    TokenUsageService,
  ],
})
export class AppModule {}

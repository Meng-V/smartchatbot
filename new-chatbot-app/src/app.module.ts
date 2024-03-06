import { Module } from '@nestjs/common';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { LibraryApiModule } from './library-api/library-api.module';
import { ChatGateway } from './chat/chat.gateway';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [LlmChainModule, LibraryApiModule, SharedModule],
  providers: [ChatGateway],
})
export class AppModule {}

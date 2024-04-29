import { Module } from '@nestjs/common';
import { LlmChainModule } from '../llm-chain/llm-chain.module';
import { SharedModule } from '../shared/shared.module';
import { LlmConnectionGateway } from './connection/llm-connection.gateway';
import { ChatGateway } from './chat/chat.gateway';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [LlmChainModule, DatabaseModule, SharedModule],
  providers: [ChatGateway, LlmConnectionGateway],
  exports: [ChatGateway, LlmConnectionGateway],
})
export class GatewayModule {}

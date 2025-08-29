import { Module } from '@nestjs/common';
import { LlmChainModule } from '../llm-chain/llm-chain.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatGateway } from './chat/chat.gateway';
import { LlmConnectionGateway } from './connection/llm-connection.gateway';
import { WebSocketMemoryMonitorService } from './websocket-memory-monitor.service';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    DatabaseModule,
    LlmChainModule,
    SharedModule,
    ScheduleModule.forRoot(),
  ],
  providers: [ChatGateway, LlmConnectionGateway, WebSocketMemoryMonitorService],
  exports: [WebSocketMemoryMonitorService],
})
export class GatewayModule {}

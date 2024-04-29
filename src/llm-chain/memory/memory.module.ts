import { Module } from '@nestjs/common';
import { ConversationMemoryService } from './conversation-memory/conversation-memory.service';
import { PromptModule } from '../prompt/prompt.module';
import { LlmModule } from '../llm/llm.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [PromptModule, LlmModule, SharedModule],
  providers: [ConversationMemoryService],
  exports: [ConversationMemoryService],
})
export class MemoryModule {}

import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { LlmToolboxModule } from './llm-toolbox/llm-toolbox.module';
import { AgentModule } from './agent/agent.module';
import { MemoryModule } from './memory/memory.module';
import { PromptModule } from './prompt/prompt.module';
import { LlmChainService } from './llm-chain.service';

@Module({
  imports: [
    LlmModule,
    LlmToolboxModule,
    AgentModule,
    MemoryModule,
    PromptModule,
  ],
  providers: [LlmChainService],
  exports: [LlmChainService],
})
export class LlmChainModule {}
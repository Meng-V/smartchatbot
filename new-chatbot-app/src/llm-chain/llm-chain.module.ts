import { Module } from '@nestjs/common';
import { LlmToolboxModule } from './llm-toolbox/llm-toolbox.module';
import { MemoryModule } from './memory/memory.module';
import { PromptModule } from './prompt/prompt.module';
import { LlmChainService } from './llm-chain.service';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    LlmModule,
    LlmToolboxModule,
    MemoryModule,
    PromptModule,
  ],
  providers: [LlmChainService],
  exports: [LlmChainService],
})
export class LlmChainModule {}

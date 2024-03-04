import { Test, TestingModule } from '@nestjs/testing';
import { ConversationMemoryService } from './conversation-memory.service';
import { PromptModule } from '../../../llm-chain/prompt/prompt.module';
import { MemoryModule } from '../memory.module';
import { LlmModule } from '../../../llm-chain/llm/llm.module';
import { SharedModule } from '../../../shared/shared.module';

describe('ConversationMemoryService', () => {
  let service: ConversationMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PromptModule, MemoryModule, LlmModule, SharedModule],
      providers: [ConversationMemoryService],
    }).compile();

    service = module.get<ConversationMemoryService>(ConversationMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

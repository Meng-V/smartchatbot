import { Test, TestingModule } from '@nestjs/testing';
import { ConversationSummarizationPromptService } from './conversation-summarization-prompt.service';
import { SharedModule } from '../../../shared/shared.module';

describe('ConversationSummarizationPromptService', () => {
  let service: ConversationSummarizationPromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [ConversationSummarizationPromptService],
    }).compile();

    service = module.get<ConversationSummarizationPromptService>(ConversationSummarizationPromptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

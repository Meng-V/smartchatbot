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

    service = module.get<ConversationSummarizationPromptService>(
      ConversationSummarizationPromptService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get the correct system description', () => {
    const expectedSystemDescription = 'Mocked System Description';
    service.setSystemDescription(expectedSystemDescription);

    expect(service.getSystemDescription()).toEqual(expectedSystemDescription);
  });

  it('should set and get correct conversation', () => {
    const expectedConversation = 'Mocked conversation';

    service.setConversation(expectedConversation);
    expect(service.getPrompt()).toEqual(expectedConversation);
  });
});

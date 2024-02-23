import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConversationPromptWithToolsService } from './chatbot-conversation-prompt-with-tools.service';

describe('ChatbotConversationPromptWithToolsService', () => {
  let service: ChatbotConversationPromptWithToolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotConversationPromptWithToolsService],
    }).compile();

    service = module.get<ChatbotConversationPromptWithToolsService>(ChatbotConversationPromptWithToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

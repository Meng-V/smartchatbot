import { Test, TestingModule } from '@nestjs/testing';
import { ConversationMemory } from 'src/llm-chain/memory/memory.interface';
import { ChatbotConversationPromptWithToolsService } from './chatbot-conversation-prompt-with-tools.service';
import { ConfigService } from '@nestjs/config';
import { SharedModule } from '../../../shared/shared.module';

describe('ChatbotConversationPromptWithToolsService', () => {
  let chatbotConversationPromptService: ChatbotConversationPromptWithToolsService;
  let mockedConversationMemory: jest.Mocked<ConversationMemory>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [ChatbotConversationPromptWithToolsService, ConfigService],
    }).compile();

    chatbotConversationPromptService =
      await moduleRef.resolve<ChatbotConversationPromptWithToolsService>(
        ChatbotConversationPromptWithToolsService,
      );
    mockedConversationMemory = {
      setConversationSummarizationMode: jest.fn(),
      getConversationSummarizationMode: jest.fn(),
      addToConversation: jest.fn(),
      getConversationAsString: jest.fn(),
      getTokenUsage: jest.fn(),
    };
    chatbotConversationPromptService.setConversationMemory(
      mockedConversationMemory,
    );
  });

  it('should be defined', () => {
    expect(chatbotConversationPromptService).toBeDefined();
  });

  it('should get the correct model description', () => {
    chatbotConversationPromptService._testSetModelDescription(
      'Mocked Model Description ',
    );
    chatbotConversationPromptService._testSetReActModelDescription(
      ' Mocked React Model Description ',
    );

    chatbotConversationPromptService._testSetToolsDescription(
      ' Mocked Tool Description ',
    );

    const expectedModelDescription =
      chatbotConversationPromptService.getModelDescription() +
      chatbotConversationPromptService.getToolsDescription() +
      chatbotConversationPromptService.getReActModelDescription();

    expect(chatbotConversationPromptService.getSystemDescription()).toEqual(
      expectedModelDescription,
    );
  });

  it('should update Scratchpad correctly', () => {
    let currentScratchpad = chatbotConversationPromptService.getScratchpad();
    const line1 = 'line 1 ';
    chatbotConversationPromptService.updateScratchpad(line1);
    expect(chatbotConversationPromptService.getScratchpad()).toEqual(
      currentScratchpad + line1,
    );

    const line2 = 'line 2 ';
    chatbotConversationPromptService.updateScratchpad(line2);
    expect(chatbotConversationPromptService.getScratchpad()).toEqual(
      currentScratchpad + line1 + line2,
    );

    chatbotConversationPromptService.emptyScratchpad();
    expect(chatbotConversationPromptService.getScratchpad()).toEqual('');
  });

  it('should get the correct prompt', async () => {
    mockedConversationMemory.getConversationAsString.mockResolvedValue(
      'Mock Conversation String',
    );
    chatbotConversationPromptService._testSetScratchpad('Mocked Scratchpad');

    const expectedPrompt =
      '\nThis is the conversation so far(delimited by the triple dashes)\n---\nMock Conversation String\n---\n' +
      'This is your scratchpad:\n"""\nMocked Scratchpad\n"""\n';

    expect(await chatbotConversationPromptService.getPrompt()).toEqual(
      expectedPrompt,
    );
  });

  it('should set the conversation memory', () => {
    chatbotConversationPromptService.setConversationMemory(
      mockedConversationMemory,
    );

    expect(chatbotConversationPromptService.getConversationMemory()).toEqual(
      mockedConversationMemory,
    );
  });

  it('should return undefined if the conversation memory does not exist', () => {
    chatbotConversationPromptService.setConversationMemory(undefined);
    expect(
      chatbotConversationPromptService.getConversationMemory(),
    ).toBeUndefined();
  });
});

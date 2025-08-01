import { Test, TestingModule } from '@nestjs/testing';
import { ConversationMemoryService } from './conversation-memory.service';
import { PromptModule } from '../../../llm-chain/prompt/prompt.module';
import { MemoryModule } from '../memory.module';
import { LlmService } from '../../../llm-chain/llm/llm.service';

import { SharedModule } from '../../../shared/shared.module';
import { Role } from '../memory.interface';
import { ConversationSummarizationPromptService } from '../../../llm-chain/prompt/conversation-summarization-prompt/conversation-summarization-prompt.service';
import { LlmModule } from '../../../llm-chain/llm/llm.module';

import { TokenUsageService } from '../../../shared/services/token-usage/token-usage.service';

describe('ConversationMemoryService', () => {
  let service: ConversationMemoryService;
  let llmServiceMock: LlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PromptModule, MemoryModule, SharedModule, LlmModule],
      providers: [
        ConversationMemoryService,
        LlmService,
        ConversationSummarizationPromptService,
        TokenUsageService,
      ],
    }).compile();

    service = await module.resolve<ConversationMemoryService>(
      ConversationMemoryService,
    );
    llmServiceMock = await module.resolve<LlmService>(LlmService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get conversation summarization mode correctly', () => {
    service.setConversationSummarizationMode(true);
    expect(service.getConversationSummarizationMode()).toBe(true);

    service.setConversationSummarizationMode(false);
    expect(service.getConversationSummarizationMode()).toBe(false);
  });

  it('should set max context window size and adjust conversation queue size', () => {
    expect(service.getMaxContextWindow()).toBeUndefined();
    service.setMaxContextWindow(5);
    expect(service.getMaxContextWindow()).toBe(5);

    service.setMaxContextWindow(undefined);
    expect(service.getMaxContextWindow()).toBeUndefined();
  });

  it('should add to conversation queue correctly', async () => {
    service.setConversationSummarizationMode(false);
    service.setMaxContextWindow(undefined);
    service.addToConversation(Role.AIAgent, 'AI message1');
    service.addToConversation(Role.Customer, 'Customer message1');

    expect(await service.getConversationAsString()).toEqual(
      '\nAIAgent: AI message1\nCustomer: Customer message1\n',
    );

    service.addToConversation(Role.Customer, 'Customer message2');
    expect(await service.getConversationAsString()).toEqual(
      '\nAIAgent: AI message1\nCustomer: Customer message1\nCustomer: Customer message2\n',
    );
  });

  it('should set and get conversation buffer size correctly', () => {
    service.setConversationBufferSize(10);
    expect(service.getConversationBufferSize()).toBe(10);

    service.setConversationBufferSize(undefined);
    expect(service.getConversationBufferSize()).toBeUndefined();
  });

  it('should split conversation summary and unchanged conversation correctly', async () => {
    service.setConversationSummarizationMode(true);
    service.setMaxContextWindow(4);
    service.setConversationBufferSize(1);
    service.addToConversation(Role.AIAgent, 'AI message1');
    service.addToConversation(Role.Customer, 'Customer message1');
    service.addToConversation(Role.AIAgent, 'AI message2');
    service.addToConversation(Role.Customer, 'Customer message2');

    //Mock getModelResponse
    jest
      .spyOn(llmServiceMock, 'getModelResponse')
      .mockImplementation(async () => ({
        response: 'This is summary',
        tokenUsage: {
          'o4-mini': {
            totalTokens: 100,
            promptTokens: 70,
            completionTokens: 30,
          },
        },
      }));

    let expectedResult = 'This is summary\nCustomer: Customer message2\n';

    expect(await service.getConversationAsString()).toEqual(expectedResult);

    service.setConversationBufferSize(2);
    expectedResult =
      'This is summary\nAIAgent: AI message2\nCustomer: Customer message2\n';
    expect(await service.getConversationAsString()).toEqual(expectedResult);

    //undefined bufferSize
    service.setConversationBufferSize(undefined);
    expectedResult =
      '\nAIAgent: AI message1\nCustomer: Customer message1\nAIAgent: AI message2\nCustomer: Customer message2\n';
    expect(await service.getConversationAsString()).toEqual(expectedResult);
  });

  it('should not accept invalid buffer size and maxContextWindow when setting', () => {
    //bufferSize larger than maxContextWindow
    service.setMaxContextWindow(6);
    expect(() => {
      service.setConversationBufferSize(7);
    }).toThrow(Error);

    //maxContextWindow smaller than bufferSize
    service.setConversationBufferSize(5);
    expect(() => {
      service.setMaxContextWindow(4);
    }).toThrow(Error);
  });

  it('shoud return correct token usage', async () => {
    service.setConversationSummarizationMode(true);
    service.setMaxContextWindow(4);
    service.setConversationBufferSize(2);
    service.addToConversation(Role.AIAgent, 'AI message1');
    service.addToConversation(Role.Customer, 'Customer message1');
    service.addToConversation(Role.AIAgent, 'AI message2');
    service.addToConversation(Role.Customer, 'Customer message2');

    //Mock getModelResponse
    jest
      .spyOn(llmServiceMock, 'getModelResponse')
      .mockImplementation(async () => ({
        response: 'This is summary',
        tokenUsage: {
          'o4-mini': {
            totalTokens: 100,
            promptTokens: 70,
            completionTokens: 30,
          },
        },
      }));

    //Token should be accumulate after each time call getConversationAsString
    await service.getConversationAsString();
    let expectedTokenUsage = {
      'o4-mini': {
        totalTokens: 100,
        promptTokens: 70,
        completionTokens: 30,
      },
    };
    expect(service.getTokenUsage()).toEqual(expectedTokenUsage);

    //Token should be accumulate after each time call getConversationAsString
    await service.getConversationAsString();
    expectedTokenUsage = {
      'o4-mini': {
        totalTokens: 200,
        promptTokens: 140,
        completionTokens: 60,
      },
    };
    expect(service.getTokenUsage()).toEqual(expectedTokenUsage);

    //Mock getModelResponse
    jest
      .spyOn(llmServiceMock, 'getModelResponse')
      .mockImplementation(async () => ({
        response: 'This is summary',
        tokenUsage: {
          'o4-mini': {
            totalTokens: 50,
            promptTokens: 30,
            completionTokens: 20,
          },
        },
      }));

    //Token should be accumulate after each time call getConversationAsString
    await service.getConversationAsString();
    expectedTokenUsage = {
      'o4-mini': {
        totalTokens: 250,
        promptTokens: 170,
        completionTokens: 80,
      },
    };
    expect(service.getTokenUsage()).toEqual(expectedTokenUsage);
  });
});

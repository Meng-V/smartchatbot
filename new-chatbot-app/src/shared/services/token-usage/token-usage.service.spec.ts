import { Test, TestingModule } from '@nestjs/testing';
import { TokenUsage, TokenUsageService } from './token-usage.service';
import { ChatCompletion } from 'openai/resources';

describe('TokenUsageService', () => {
  let service: TokenUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenUsageService],
    }).compile();

    service = module.get<TokenUsageService>(TokenUsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get the right Token Usage from OpenAiApiResponse', () => {
    const mockOpenaiResponse: ChatCompletion = {
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Sample content',
          },
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      model: 'gpt-3.5-turbo',
      usage: {
        total_tokens: 100,
        completion_tokens: 60,
        prompt_tokens: 40,
      },
      id: 'someID',
      object: 'chat.completion',
      created: 1,
    };
    const expectedTokenUsageResult: TokenUsage = {
      'gpt-3.5-turbo': {
        totalTokens: 100,
        completionTokens: 60,
        promptTokens: 40,
      },
    };

    const tokenUsage =
      service.getTokenUsageFromOpenAiApiResponse(mockOpenaiResponse);
    expect(tokenUsage).toEqual(expectedTokenUsageResult);
  });

  it('should combine TokenUsage objects correctly', () => {
    let mockTokenUsage1: TokenUsage = {
      'gpt-3.5-turbo-0301': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
    };
    let mockTokenUsage2: TokenUsage = {
      'gpt-4-0314': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    let expectedTokenUsageResult: TokenUsage = {
      'gpt-4-0314': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
      'gpt-3.5-turbo-0301': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
    };

    expect(service.combineTokenUsage(mockTokenUsage1, mockTokenUsage2)).toEqual(
      expectedTokenUsageResult,
    );

    mockTokenUsage1 = {
      'gpt-3.5-turbo-0301': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
      'gpt-4-0314': {
        totalTokens: 400,
        promptTokens: 200,
        completionTokens: 200,
      },
    };
    mockTokenUsage2 = {
      'gpt-4-0314': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    expectedTokenUsageResult = {
      'gpt-4-0314': {
        totalTokens: 540,
        promptTokens: 310,
        completionTokens: 230,
      },
      'gpt-3.5-turbo-0301': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
    };
    expect(service.combineTokenUsage(mockTokenUsage1, mockTokenUsage2)).toEqual(
      expectedTokenUsageResult,
    );

    //Should be able to deal with empty object
    mockTokenUsage1 = {};
    mockTokenUsage2 = {
      'gpt-4-0314': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    expectedTokenUsageResult = {
      'gpt-4-0314': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };
    expect(service.combineTokenUsage(mockTokenUsage1, mockTokenUsage2)).toEqual(
      expectedTokenUsageResult,
    );
  });
});

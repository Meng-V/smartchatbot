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
            refusal: null,
          },
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      model: 'o4-mini',
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
      'o4-mini': {
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
      'o4-mini': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
    };
    let mockTokenUsage2: TokenUsage = {
      'o4-mini': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    let expectedTokenUsageResult: TokenUsage = {
      'o4-mini': {
        totalTokens: 240,
        promptTokens: 160,
        completionTokens: 80,
      },
    };

    expect(service.combineTokenUsage(mockTokenUsage1, mockTokenUsage2)).toEqual(
      expectedTokenUsageResult,
    );

    mockTokenUsage1 = {
      'o4-mini': {
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50,
      },
    };
    mockTokenUsage2 = {
      'o4-mini': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    expectedTokenUsageResult = {
      'o4-mini': {
        totalTokens: 240,
        promptTokens: 160,
        completionTokens: 80,
      },
    };
    expect(service.combineTokenUsage(mockTokenUsage1, mockTokenUsage2)).toEqual(
      expectedTokenUsageResult,
    );

    //Should be able to deal with empty object
    mockTokenUsage1 = {};
    mockTokenUsage2 = {
      'o4-mini': {
        totalTokens: 140,
        promptTokens: 110,
        completionTokens: 30,
      },
    };

    expectedTokenUsageResult = {
      'o4-mini': {
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

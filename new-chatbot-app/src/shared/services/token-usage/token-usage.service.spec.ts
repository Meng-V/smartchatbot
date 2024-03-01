import { Test, TestingModule } from '@nestjs/testing';
import { TokenUsage, TokenUsageService } from './token-usage.service';
import { AxiosResponse } from 'axios';
import { CreateChatCompletionResponse } from 'openai';

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
    const mockAxiosResponse: AxiosResponse<CreateChatCompletionResponse, any> =
      {
        data: {
          choices: [
            {
              message: {
                role: 'system',
                content: 'Sample content',
              },
            },
          ],
          model: 'gpt-3.5-turbo',
          usage: {
            total_tokens: 100,
            completion_tokens: 60,
            prompt_tokens: 40,
          },
          id: 'someID',
          object: 'someObj',
          created: 1,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    const expectedTokenUsageResult: TokenUsage = {
      'gpt-3.5-turbo': {
        totalTokens: 100,
        completionTokens: 60,
        promptTokens: 40,
      },
    };

    const tokenUsage =
      service.getTokenUsageFromOpenAiApiResponse(mockAxiosResponse);
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
  });
});

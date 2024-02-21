import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { LlmInterface } from './llm.interface';
import { OpenAIApi } from 'openai';
import { OpenaiApiService } from './openai-api/openai-api.service';
import { PromptInterface } from '../prompt/prompt.interface';
import { TokenUsageService } from '../../shared/services/token-usage/token-usage.service';

describe('LlmService', () => {
  let service: LlmService;
  let openaiServiceMock: jest.Mocked<OpenaiApiService>;
  let promptMock: jest.Mocked<PromptInterface>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: OpenaiApiService,
          useFactory: () => ({
            getModelResponse: jest.fn(),
          }),
        },
        TokenUsageService,
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    openaiServiceMock = module.get<LlmInterface>(
      OpenaiApiService,
    ) as jest.Mocked<OpenaiApiService>;
    promptMock = {
      modelDescription: 'Mocked Model Description',
      getSystemDescription: jest.fn(), // Mocked method
      getPrompt: jest.fn(), // Mocked method
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct llm response and token usage', async () => {
    promptMock.getPrompt.mockResolvedValue({
      prompt: 'Mocked Prompt',
      tokenUsage: {
        'gpt-3.5-turbo': {
          totalTokens: 70,
          promptTokens: 50,
          completionTokens: 20,
        },
      },
    });
    const mockOpenaiResponse: { response: string; tokenUsage: TokenUsage } = {
      response: 'This is LLM response',
      tokenUsage: {
        'gpt-4': {
          totalTokens: 100,
          promptTokens: 70,
          completionTokens: 30,
        },
      },
    };
    const expectedResponse: { response: string; tokenUsage: TokenUsage } = {
      response: 'This is LLM response',
      tokenUsage: {
        'gpt-4': {
          totalTokens: 100,
          promptTokens: 70,
          completionTokens: 30,
        },
        'gpt-3.5-turbo': {
          totalTokens: 70,
          promptTokens: 50,
          completionTokens: 20,
        },
      },
    };

    openaiServiceMock.getModelResponse.mockResolvedValue(mockOpenaiResponse);

    const actualResponse = await service.getModelResponse(
      promptMock,
      'gpt-4',
      0.3,
      0.1,
    );

    expect(actualResponse).toEqual(expectedResponse);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { LlmInterface } from './llm.interface';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';
import { Prompt } from '../prompt/prompt.interface';
import {
  TokenUsage,
  TokenUsageService,
} from '../../shared/services/token-usage/token-usage.service';
import { ApiResilienceService } from '../../shared/services/api-resilience/api-resilience.service';

describe('LlmService', () => {
  let service: LlmService;
  let openaiServiceMock: jest.Mocked<OpenaiApiService>;
  let promptMock: jest.Mocked<Prompt>;

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
        ApiResilienceService,
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    openaiServiceMock = module.get<LlmInterface>(
      OpenaiApiService,
    ) as jest.Mocked<OpenaiApiService>;
    promptMock = {
      getSystemDescription: jest.fn(),
      getPrompt: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct llm response and token usage', async () => {
    promptMock.getPrompt.mockResolvedValue('Mocked Prompt');
    const mockOpenaiResponse: { response: string; tokenUsage: TokenUsage } = {
      response: 'This is LLM response',
      tokenUsage: {
        'o4-mini': {
          totalTokens: 100,
          promptTokens: 70,
          completionTokens: 30,
        },
      },
    };
    const expectedResponse: { response: string; tokenUsage: TokenUsage } = {
      response: 'This is LLM response',
      tokenUsage: {
        'o4-mini': {
          totalTokens: 100,
          promptTokens: 70,
          completionTokens: 30,
        },
      },
    };

    openaiServiceMock.getModelResponse.mockResolvedValue(mockOpenaiResponse);

    const actualResponse = await service.getModelResponse(
      promptMock,
      OpenAiModelType.GPT_o4_mini,
      0.3,
    );

    expect(actualResponse).toEqual(expectedResponse);
  });
});

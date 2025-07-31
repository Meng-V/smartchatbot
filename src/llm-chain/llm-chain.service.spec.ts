import { Test, TestingModule } from '@nestjs/testing';
import { LlmChainService } from './llm-chain.service';
import { SharedModule } from '../shared/shared.module';
import { MemoryModule } from './memory/memory.module';
import { LlmModule } from './llm/llm.module';
import { PromptModule } from './prompt/prompt.module';
import { LlmService } from './llm/llm.service';
import { LlmChainModule } from './llm-chain.module';
import { LlmToolboxModule } from './llm-toolbox/llm-toolbox.module';
import { LlmAnswerParserService } from './llm-answer-parser/llm-answer-parser.service';

describe('LlmChainService', () => {
  let llmChainService: LlmChainService;
  let mockedLlmService: LlmService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        SharedModule,
        MemoryModule,
        LlmModule,
        PromptModule,
        LlmChainModule,
        LlmToolboxModule,
      ],
      providers: [LlmChainService, LlmAnswerParserService],
    }).compile();

    llmChainService = await moduleRef.resolve<LlmChainService>(LlmChainService);
    mockedLlmService = await moduleRef.resolve<LlmService>(LlmService);
  });

  it('should be defined', () => {
    expect(llmChainService).toBeDefined();
  });

  it('should get the correct model response', async () => {
    const expectedLlmResponse = {
      Thought: 'this is thought',
      'Final Answer': 'This is final answer',
    };
    jest
      .spyOn(mockedLlmService, 'getModelResponse')
      .mockImplementation(async () => ({
        response: JSON.stringify(expectedLlmResponse),
        tokenUsage: {
          'o4-mini': {
            totalTokens: 100,
            promptTokens: 70,
            completionTokens: 30,
          },
        },
      }));

    expect(await llmChainService.getModelResponse('Message from user')).toEqual(
      expectedLlmResponse['Final Answer'],
    );
  });

  it('should get the correct token usage', async () => {
    const expectedLlmResponse = {
      Thought: 'this is thought',
      'Final Answer': 'This is final answer',
    };
    jest
      .spyOn(mockedLlmService, 'getModelResponse')
      .mockImplementation(async () => ({
        response: JSON.stringify(expectedLlmResponse),
        tokenUsage: {
          'o4-mini': {
            totalTokens: 100,
            promptTokens: 70,
            completionTokens: 30,
          },
        },
      }));
    jest
      .spyOn(llmChainService['memoryService'], 'getTokenUsage')
      .mockReturnValue({
        'o4-mini': {
          totalTokens: 90,
          promptTokens: 60,
          completionTokens: 30,
        },
      });

    //Pretend asking for LLM Chain response
    await llmChainService.getModelResponse('_');

    expect(llmChainService.getTokenUsage()).toEqual({
      'o4-mini': {
        totalTokens: 100,
        promptTokens: 70,
        completionTokens: 30,
      },
    });
  });
});

import { Global, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { CreateChatCompletionResponse } from 'openai';
import { OpenAiModelType } from 'src/llm-chain/llm/openai-api/openai-api.service';

export type ModelTokenUsage = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

export type TokenUsage = Partial<Record<OpenAiModelType, ModelTokenUsage>>;

/**
 * Service used for everything TokenUsage related
 */
@Injectable()
@Global()
export class TokenUsageService {
  /**
   * Extract token usage from the response from OpenAI API
   * @param openaiApiResponse
   * @returns
   */
  getTokenUsageFromOpenAiApiResponse(
    openaiApiResponse: AxiosResponse<CreateChatCompletionResponse, any>,
  ): TokenUsage {
    const tokenUsage: TokenUsage = {};
    if (openaiApiResponse.data && openaiApiResponse.data.usage) {
      // Extract the usage information from the openaiApiResponse
      const openAIModelType: OpenAiModelType = openaiApiResponse.data
        .model as OpenAiModelType;
      tokenUsage[openAIModelType] = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      };
      tokenUsage[openAIModelType]!.totalTokens +=
        openaiApiResponse.data.usage!.total_tokens;
      tokenUsage[openAIModelType]!.completionTokens +=
        openaiApiResponse.data.usage!.completion_tokens;
      tokenUsage[openAIModelType]!.promptTokens +=
        openaiApiResponse.data.usage!.prompt_tokens;
    }
    return tokenUsage;
  }

  /**
   * Combine 2 tokenUsage object
   * @param tokenUsage1
   * @param tokenUsage2
   */
  combineTokenUsage(
    tokenUsage1: TokenUsage,
    tokenUsage2: TokenUsage,
  ): TokenUsage {
    const returnedTokenUsage: TokenUsage = {};
    const uniqueModelNames: OpenAiModelType[] = (() => {
      let modelNames = Object.keys(tokenUsage1) as OpenAiModelType[];
      modelNames = [
        ...new Set(
          modelNames.concat(Object.keys(tokenUsage2) as OpenAiModelType[]),
        ),
      ];
      return modelNames;
    })();

    for (const modelName of uniqueModelNames) {
      const modelTokenUsage1: ModelTokenUsage =
        tokenUsage1[modelName] !== undefined
          ? tokenUsage1[modelName]!
          : { totalTokens: 0, promptTokens: 0, completionTokens: 0 };

      const modelTokenUsage2: ModelTokenUsage =
        tokenUsage2[modelName] !== undefined
          ? tokenUsage2[modelName]!
          : { totalTokens: 0, promptTokens: 0, completionTokens: 0 };

      if (returnedTokenUsage[modelName] === undefined) {
        returnedTokenUsage[modelName] = {
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
        };
      }

      returnedTokenUsage[modelName]!.totalTokens +=
        modelTokenUsage1.totalTokens + modelTokenUsage2.totalTokens;
      returnedTokenUsage[modelName]!.promptTokens +=
        modelTokenUsage1.promptTokens + modelTokenUsage2.promptTokens;
      returnedTokenUsage[modelName]!.completionTokens +=
        modelTokenUsage1.completionTokens + modelTokenUsage2.completionTokens;
    }

    return returnedTokenUsage;
  }
}

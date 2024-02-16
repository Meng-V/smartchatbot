import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { CreateChatCompletionResponse } from 'openai';

@Injectable()
export class TokenUsageService {
  getTokenUsageFromOpenAiApiResponse(
    openAIApiResponse: AxiosResponse<CreateChatCompletionResponse, any>,
  ): TokenUsage {
    const tokenUsage: TokenUsage = {};
    if (openAIApiResponse.data.choices[0].message?.content) {
      // Extract the usage information from the openAIApiResponse
      const openAIModelName: ModelName = openAIApiResponse.data
        .model as ModelName;
      tokenUsage[openAIModelName] = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      };
      tokenUsage[openAIModelName]!.totalTokens +=
        openAIApiResponse.data.usage!.total_tokens;
      tokenUsage[openAIModelName]!.completionTokens +=
        openAIApiResponse.data.usage!.completion_tokens;
      tokenUsage[openAIModelName]!.promptTokens +=
        openAIApiResponse.data.usage!.prompt_tokens;
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
    let modelNames: ModelName[] = Object.keys(tokenUsage1) as ModelName[];
    modelNames = modelNames.concat(Object.keys(tokenUsage2) as ModelName[]);

    for (const modelName of modelNames) {
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

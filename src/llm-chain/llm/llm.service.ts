import { Injectable, Logger } from '@nestjs/common';

import { Prompt } from '../prompt/prompt.interface';
import { TokenUsage } from '../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from './llm.interface';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';
import { LlmModelType } from './llm.module';
import { ApiResilienceService } from '../../shared/services/api-resilience/api-resilience.service';

/**
 * Service for getting response from different LLM model and number of token used
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private openaiApiService: OpenaiApiService,
    private apiResilienceService: ApiResilienceService,
  ) {}

  /**
   * Get the LLM Model from input model name
   * @param modelName
   * @returns the requested LLM model
   * @throws {Error} Throw an error if the input model name doesn't match any correct name
   */
  private getModel(modelName: LlmModelType): LlmInterface {
    if (Object.values(OpenAiModelType).includes(modelName as OpenAiModelType)) {
      return this.openaiApiService;
    } else {
      const errorMsg = `No model name ${modelName}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Get LLM model response with the number of tokens used information.
   * @param prompt input prompt
   * @param modelName
   * @param temperature
   * @param top_p
   * @returns
   */
  public async getModelResponse(
    prompt: Prompt,
    modelType: LlmModelType,
    temperature: number = 1,
    responseFormat: 'text' | 'json_object' = 'text',
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    //Get the appropriate model
    let model: LlmInterface;
    try {
      model = this.getModel(modelType);
    } catch (error: any) {
      throw error;
    }

    // Execute with API resilience (retry + circuit breaker + timeout)
    return await this.apiResilienceService.executeWithResilience(
      `llm-${modelType}`,
      async () => {
        const { response, tokenUsage: responseTokenUsage } =
          await model.getModelResponse(
            await prompt.getPrompt(),
            prompt.getSystemDescription(),
            modelType,
            temperature,
            responseFormat,
          );
        return {
          response: response,
          tokenUsage: responseTokenUsage,
        };
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        timeoutMs: 45000 // 45 seconds for LLM calls
      },
      {
        failureThreshold: 5,
        recoveryTimeoutMs: 120000, // 2 minutes for LLM recovery
        monitoringPeriodMs: 300000
      }
    );
  }
}

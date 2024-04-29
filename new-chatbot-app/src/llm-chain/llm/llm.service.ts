import { Injectable, Logger } from '@nestjs/common';

import { Prompt } from '../prompt/prompt.interface';
import { TokenUsage } from '../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from './llm.interface';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';
import { LlmModelType } from './llm.module';

/**
 * Service for getting response from different LLM model and number of token used
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private openaiApiService: OpenaiApiService) {}

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
    temperature: number = 0.0,
    responseFormat: 'text' | 'json_object' = 'text',
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    //Get the appropriate model
    let model: LlmInterface;
    try {
      model = this.getModel(modelType);
    } catch (error: any) {
      throw error;
    }

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
  }
}

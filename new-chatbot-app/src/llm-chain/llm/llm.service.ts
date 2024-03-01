import { Injectable, Logger } from '@nestjs/common';

import { Prompt } from '../prompt/prompt.interface';
import {
  TokenUsage,
  TokenUsageService,
} from '../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from './llm.interface';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';

/**
 * Service for getting response from different LLM model and number of token used
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private tokenUsageService: TokenUsageService,
    private openaiApiService: OpenaiApiService,
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
  async getModelResponse(
    prompt: Prompt,
    modelType: LlmModelType,
    temperature: number = 0.0,
    top_p: number = 0.1,
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    return new Promise<{ response: string; tokenUsage: TokenUsage }>(
      async (resolve, reject) => {
        //Get the appropriate model
        let model: LlmInterface;
        try {
          model = this.getModel(modelType);
        } catch (e: any) {
          throw new Error(e);
        }

        // Get the prompt from the prompt object
        const promptString = await prompt.getPrompt();

        const { response, tokenUsage: responseTokenUsage } =
          await model.getModelResponse(
            promptString,
            prompt.getSystemDescription(),
            temperature,
            top_p,
          );

        resolve({
          response: response,
          tokenUsage: responseTokenUsage,
        });
      },
    );
  }
}

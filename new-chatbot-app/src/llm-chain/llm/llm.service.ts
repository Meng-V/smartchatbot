import { Injectable, Logger } from '@nestjs/common';

import { Prompt } from '../prompt/prompt.interface';
import { TokenUsageService } from '../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from './llm.interface';
import { OpenaiApiService } from './openai-api/openai-api.service';

/**
 * Service for getting response from different LLM model and number of token used
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private openaiModelNameList: string[] = Object.values(OpenAiModelType);

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
  private getModel(modelName: OpenAiModelType): LlmInterface {
    if (this.openaiModelNameList.includes(modelName)) {
      return this.openaiApiService;
    } else {
      const errorMsg = `No model name ${modelName}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Get LLM model response with the total number of tokens used
   * @param promptObject input prompt
   * @param modelName
   * @param temperature
   * @param top_p
   * @returns
   */
  async getModelResponse(
    promptObject: Prompt,
    modelName: OpenAiModelType = OpenAiModelType.GPT_4,
    temperature: number = 0.0,
    top_p: number = 0.1,
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    return new Promise<{ response: string; tokenUsage: TokenUsage }>(
      async (resolve, reject) => {
        //Get the appropriate model
        const model: LlmInterface = this.getModel(modelName);

        // Get the prompt from the prompt object
        const { prompt, tokenUsage: promptTokenUsage } =
          await promptObject.getPrompt();
        const promptTokenUsageWithModel: TokenUsage = {};
        promptTokenUsageWithModel[modelName] = promptTokenUsage;

        const { response, tokenUsage: responseTokenUsage } =
          await model.getModelResponse(
            prompt,
            promptObject.getSystemDescription(),
            temperature,
            top_p,
          );

        resolve({
          response: response,
          tokenUsage: this.tokenUsageService.combineTokenUsage(
            promptTokenUsageWithModel,
            responseTokenUsage,
          ),
        });
      },
    );
  }
}

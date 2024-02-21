import { Injectable, Logger } from '@nestjs/common';

import { PromptInterface } from '../prompt/prompt.interface';
import { TokenUsageService } from '../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from './llm.interface';
import { OpenaiApiService } from './openai-api/openai-api.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private openaiModelNameList: ModelName[] = [
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-0301',
    'gpt-4-0613',
    'gpt-4-0314',
    'gpt-4',
  ];

  constructor(
    private tokenUsageService: TokenUsageService,
    private openaiApiService: OpenaiApiService,
  ) {}

  private getModel(modelName: string): LlmInterface {
    if (this.openaiModelNameList.includes(modelName as ModelName)) {
      return this.openaiApiService;
    } else {
      const errorMsg = `No model name ${modelName as ModelName}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async getModelResponse(
    promptObject: PromptInterface,
    modelName: ModelName = 'gpt-4',
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
            promptTokenUsage,
            responseTokenUsage,
          ),
        });
      },
    );
  }
}

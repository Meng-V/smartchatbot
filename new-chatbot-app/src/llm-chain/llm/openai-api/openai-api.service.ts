import { Injectable, Logger } from '@nestjs/common';

import OpenAI from 'openai';

import { NetworkService } from '../../../shared/services/network/network.service';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import {
  TokenUsage,
  TokenUsageService,
} from '../../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from '../llm.interface';
import { ChatCompletion } from 'openai/resources';

export enum OpenAiModelType {
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_3_5_TURBO_0613 = 'gpt-3.5-turbo-0613',
  GPT_3_5_TURBO_0301 = 'gpt-3.5-turbo-0301',
  GPT_4 = 'gpt-4',
  GPT_4_0613 = 'gpt-4-0613',
  GPT_4_0314 = 'gpt-4-0314',
  GPT_4_TURBO = 'gpt-4-0125-preview',
}

/**
 * Service for getting response from OpenAI LLM
 */
@Injectable()
export class OpenaiApiService implements LlmInterface {
  private readonly logger = new Logger(OpenaiApiService.name);
  private readonly openai: OpenAI;

  constructor(
    private networkService: NetworkService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private tokenUsageService: TokenUsageService,
  ) {
    this.openai = new OpenAI({
      organization: this.retrieveEnvironmentVariablesService.retrieve<string>(
        'OPENAI_ORGANIZATION_ID',
      ),
      apiKey:
        this.retrieveEnvironmentVariablesService.retrieve('OPENAI_API_KEY'),
    });
  }

  /**
   * Get LLM response from OpenAI API with input message and configuration
   * @param systemPrompt prompt for the system
   * @param userPrompt prompt for user role
   * @param modelName openai llm name
   * @param temperature temperature for model
   * @param top_p
   * @returns
   * @throws Throw error if doesn't receive any message from the OpenAI API
   */
  async getModelResponse(
    userPrompt: string,
    systemPrompt?: string,
    modelName: OpenAiModelType = OpenAiModelType.GPT_4,
    temperature: number = 0.0,
    top_p: number = 0.1,
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    let modelResponse;
    try {
      modelResponse =
        await this.networkService.retryWithMaxAttempts<ChatCompletion>(
          async (): Promise<ChatCompletion> => {
            const chatResponse = await this.openai.chat.completions.create({
              model: modelName as string,
              temperature: temperature,
              top_p: top_p,
              messages: [
                {
                  role: 'system',
                  content: systemPrompt !== undefined ? systemPrompt : '',
                },
                { role: 'user', content: userPrompt },
              ],
            });
            return chatResponse;
          },
          5,
        );
    } catch (error: any) {
      console.log(error);
      throw error;
    }

    if (modelResponse.choices[0].message?.content) {
      // Extract the usage information from the modelResponse
      const openAiApiTokenUsage: TokenUsage =
        this.tokenUsageService.getTokenUsageFromOpenAiApiResponse(
          modelResponse,
        );
      return {
        response: modelResponse.choices[0].message?.content,
        tokenUsage: openAiApiTokenUsage,
      };
    } else {
      const errorMsg = 'Error: No modelResponse from the model';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

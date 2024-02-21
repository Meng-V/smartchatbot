import { Injectable, Logger } from '@nestjs/common';

import { Configuration, CreateChatCompletionResponse, OpenAIApi } from 'openai';
import { AxiosResponse } from 'axios';

import { NetworkService } from '../../../shared/services/network/network.service';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { TokenUsageService } from '../../../shared/services/token-usage/token-usage.service';
import { LlmInterface } from '../llm.interface';

/**
 * Service for getting response from OpenAI LLM
 */
@Injectable()
export class OpenaiApiService implements LlmInterface {
  private readonly logger = new Logger(OpenaiApiService.name);
  private readonly model: OpenAIApi;

  constructor(
    private networkService: NetworkService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private tokenUsageService: TokenUsageService,
  ) {
    const modelConfiguration = new Configuration({
      organization: this.retrieveEnvironmentVariablesService.retrieve(
        'OPENAI_ORGANIZATION_ID',
      ),
      apiKey:
        this.retrieveEnvironmentVariablesService.retrieve('OPENAI_API_KEY'),
    });
    this.model = new OpenAIApi(modelConfiguration);
  }

  /**
   * Get LLM response from OpenAI API with input message and configuration
   * @param systemPrompt prompt for the system
   * @param userPrompt prompt for user role
   * @param modelName openai llm name
   * @param temperature temperature for model
   * @param top_p 
   * @returns 
   */
  async getModelResponse(
    systemPrompt: string,
    userPrompt: string,
    modelName: ModelName = 'gpt-4',
    temperature: number = 0.0,
    top_p: number = 0.1,
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    return new Promise<{ response: string; tokenUsage: TokenUsage }>(
      async (resolve, reject) => {
        // Get the prompt from the prompt object
        let response; // The response from the model, as a result to be returned
        try {
          response = await this.networkService.retryWithMaxAttempts<
            AxiosResponse<CreateChatCompletionResponse, any>
          >((): Promise<AxiosResponse<CreateChatCompletionResponse, any>> => {
            return new Promise<
              AxiosResponse<CreateChatCompletionResponse, any>
            >((resolve, reject) => {
              try {
                const chatResponse = this.model.createChatCompletion({
                  model: modelName,
                  temperature: temperature,
                  top_p: top_p,
                  messages: [
                    {
                      role: 'system',
                      content: systemPrompt,
                    },
                    { role: 'user', content: userPrompt },
                  ],
                }) as Promise<AxiosResponse<CreateChatCompletionResponse, any>>;
                resolve(chatResponse);
              } catch (error: any) {
                reject(error);
              }
            });
          });
        } catch (error: any) {
          reject(error);
          return;
        }

        if (response.data.choices[0].message?.content) {
          // Extract the usage information from the response
          const openAiApiTokenUsage: TokenUsage =
            this.tokenUsageService.getTokenUsageFromOpenAiApiResponse(response);
          resolve({
            response: response.data.choices[0].message?.content,
            tokenUsage: openAiApiTokenUsage,
          });
        } else {
          const errorMsg = 'Error: No response from the model';
          this.logger.error(errorMsg);
          throw new Error(errorMsg);
        }
      },
    );
  }
}

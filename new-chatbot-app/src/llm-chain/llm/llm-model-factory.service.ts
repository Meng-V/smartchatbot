import { Injectable, Logger } from '@nestjs/common';

import { Configuration, CreateChatCompletionResponse, OpenAIApi } from 'openai';
import { AxiosResponse } from 'axios';

import { LlmModelSetting } from './llm.module';
import { PromptTemplate, PromptModule } from '../prompt/prompt.module';
import { NetworkService } from 'src/shared/services/network/network.service';
import { ConfigService } from '@nestjs/config';
import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { TokenUsageService } from '../../shared/services/token-usage/token-usage.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
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

  async getModelResponse(
    promptObject: PromptTemplate,
    modelName: ModelName = 'gpt-4',
    temperature: number = 0.0,
    top_p: number = 0.1,
  ): Promise<{ response: string; tokenUsage: TokenUsage }> {
    return new Promise<{ response: string; tokenUsage: TokenUsage }>(
      async (resolve, reject) => {
        // Get the prompt from the prompt object
        const promptObjectResponse = await promptObject.getPrompt();
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
                      content: promptObject.getSystemDescription(),
                    },
                    { role: 'user', content: promptObjectResponse.prompt },
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
            tokenUsage: this.tokenUsageService.combineTokenUsage(
              promptObjectResponse.tokenUsage,
              openAiApiTokenUsage,
            ),
          });
        } else {
          const errorMsg = 'Error: No response from the model';
          this.logger.error(errorMsg);
          reject({
            response: errorMsg,
          });
        }
      },
    );
  }
}

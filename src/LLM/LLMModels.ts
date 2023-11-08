import { Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { TokenUsage } from "../Agent/IAgent";
import { retryWithMaxAttempts } from "../Utils/NetworkUtils";
import { AxiosResponse } from "axios";

type LLMModelSetting = {
  modelName: ModelName;
  temperature: number;
  top_p: number;
};
type LLMModelSettingString = string;
type ModelName = "gpt-3.5-turbo" | "gpt-3.5-turbo-0613" | "gpt-3.5-turbo-0301" | "gpt-4-0613" | "gpt-4-0314" | "gpt-4";
/**
 * OpenAIModel would connect with OpenAI GPT3.5 or GPT4 ChatCompletion API and get the model response
 */
class OpenAIModel {
  private modelConfiguration: Configuration;
  private model: OpenAIApi;
  private static modelLookUp: Map<LLMModelSettingString, OpenAIModel> =
    new Map();

  /**
   * Private Constructor. Go to OpenAI API website to know more about these parameters
   * @param modelName model  
   * @param temperature
   * @param top_p 
   */
  private constructor(
    private modelName: ModelName,
    private temperature: number,
    private top_p: number
  ) {
    this.modelConfiguration = new Configuration({
      organization: "org-4LbKZFYAeYBUivA5qxcat7n6",
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = new OpenAIApi(this.modelConfiguration);
    this.modelName = modelName;
    this.temperature = temperature;
    this.top_p = top_p;
  }

  /**
   * Get or create new instance. Follow Singleton design pattern
   * @param modelName 
   * @param temperature 
   * @param top_p 
   * @returns 
   */
  public static getInstance(
    modelName: ModelName,
    temperature: number = 0.0,
    top_p: number = 0.1
  ): OpenAIModel {
    const modelSetting: LLMModelSetting = {
      modelName: modelName,
      temperature: temperature,
      top_p: top_p,
    };
    const modelSettingString: LLMModelSettingString =
      JSON.stringify(modelSetting);

    if (!this.modelLookUp.has(modelSettingString)) {
      this.modelLookUp.set(
        modelSettingString,
        new OpenAIModel(modelName, temperature, top_p)
      );
    }

    return this.modelLookUp.get(modelSettingString)!;
  }

  /**
   * This function takes in user input and async return the AIAgent answer
   * @param inputPrompt
   * @returns
   */
  async getModelResponse(
    promptObject: PromptTemplate
  ): Promise<{ response: string; usage: TokenUsage }> {
    return new Promise<{ response: string; usage: TokenUsage }>(
      async (resolve, reject) => {
        // const timeout = setTimeout(() => {
        //   reject("Request Time Out");
        // }, 5000);
        const promptObjectResponse = await promptObject.getPrompt();

        const usageInfo: TokenUsage = {
          totalTokens: 0,
          completionTokens: 0,
          promptTokens: 0,
        };
        if ("tokenUsage" in promptObjectResponse) {
          usageInfo.totalTokens += promptObjectResponse.tokenUsage.totalTokens;
          usageInfo.completionTokens +=
            promptObjectResponse.tokenUsage.completionTokens;
          usageInfo.promptTokens +=
            promptObjectResponse.tokenUsage.promptTokens;
        }

        let response;
        try {
          response = await retryWithMaxAttempts<
            AxiosResponse<CreateChatCompletionResponse, any>
          >((): Promise<AxiosResponse<CreateChatCompletionResponse, any>> => {
            return new Promise<
              AxiosResponse<CreateChatCompletionResponse, any>
            >((resolve, reject) => {
              try {
                console.log(promptObjectResponse.prompt)
                const chatResponse = this.model.createChatCompletion({
                  model: this.modelName,
                  temperature: this.temperature,
                  top_p: this.top_p,
                  messages: [
                    {
                      role: "system",
                      content: promptObject.getSystemDescription(),
                    },
                    { role: "user", content: promptObjectResponse.prompt },
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
          usageInfo.totalTokens += response.data.usage!.total_tokens;
          usageInfo.completionTokens += response.data.usage!.completion_tokens;
          usageInfo.promptTokens += response.data.usage!.prompt_tokens;
          resolve({
            response: response.data.choices[0].message?.content,
            usage: usageInfo,
          });
        } else {
          reject({
            response: "Error: No response from the mode",
            usage: usageInfo,
          });
        }
      }
    );
  }
}
export { OpenAIModel };

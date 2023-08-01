import {
  Configuration,
  CreateCompletionResponseUsage,
  OpenAIApi,
} from "openai";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { ModelPromptWithTools } from "../Prompt/Prompts";
import { TokenUsage } from "../Agent/IAgent";

type LLMModelSetting = {
  modelName: string;
  temperature: number;
  top_p: number;
};
type LLMModelSettingString = string;

class OpenAIModel {
  private modelConfiguration: Configuration;
  private model: OpenAIApi;
  private static modelLookUp: Map<LLMModelSettingString, OpenAIModel> =
    new Map();

  private constructor(
    private modelName: string,
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

  public static getInstance(
    modelName: string,
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
        // console.log('----------------')
        // console.log(promptObjectResponse.prompt);
        // console.log('----------------')

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
        console.log('Using LLM!');
        const response = await this.model.createChatCompletion({
          model: this.modelName,
          temperature: this.temperature,
          top_p: this.top_p,
          messages: [
            { role: "system", content: promptObject.getSystemDescription() },
            { role: "user", content: promptObjectResponse.prompt },
          ],
        });
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

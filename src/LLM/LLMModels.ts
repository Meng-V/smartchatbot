import { Configuration, OpenAIApi } from "openai";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { ModelPromptWithTools } from "../Prompt/Prompts";

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

  private constructor(private modelName: string, private temperature: number, private top_p: number) {
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
    temperature: number = 0.1,
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
      this.modelLookUp.set(modelSettingString, new OpenAIModel(modelName, temperature, top_p));
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
  ): Promise<{ response: string; usage: any }> {
    return new Promise(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject("Request Time Out");
      // }, 5000);
      const prompt = await promptObject.getPrompt();
      console.log(prompt);
      const response = await this.model.createChatCompletion({
        model: this.modelName,
        temperature: this.temperature,
        top_p: this.top_p,
        messages: [
          { role: "system", content: promptObject.getSystemDescription() },
          { role: "user", content: prompt },
        ],
      });
      if (response.data.choices[0].message?.content) {
        // Extract the usage information from the response
        const usageInfo = response.data.usage;
        resolve({
          response: response.data.choices[0].message?.content,
          usage: usageInfo,
        });
      } else {
        reject("No response from model");
      }
    });
  }
}

export { OpenAIModel };

import { Configuration, OpenAIApi } from "openai";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import * as dotenv from 'dotenv';

dotenv.config();
class OpenAIModel {
  private modelConfiguration: Configuration;
  public model: OpenAIApi;
  public readonly modelName: string = "gpt-3.5-turbo";
  private temperature: number;

  constructor(temperature = 0) {
    this.modelConfiguration = new Configuration({
      organization: "org-4LbKZFYAeYBUivA5qxcat7n6",
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = new OpenAIApi(this.modelConfiguration);
    this.temperature = temperature;
  }

  /**
   * This function takes in user input and async return the AIAgent answer
   * @param inputPrompt
   * @returns
   */
  async getModelResponse(promptTemplate: PromptTemplate): Promise<string> {
    return new Promise(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject("Request Time Out");
      // }, 5000);
      const prompt = promptTemplate.getPrompt();
      const response = await this.model.createChatCompletion({
        model: this.modelName,
        temperature: this.temperature,
        messages: [{role: "user", content: prompt}]
      });
      if (response.data.choices[0].message?.content) resolve(response.data.choices[0].message?.content);
      else reject("No response from model");
    });
  }
}

export { OpenAIModel };

import { Configuration, OpenAIApi, CreateCompletionRequest } from "openai";
import { PromptAnalyzeInformation, PromptWithTools } from "../Prompt/Prompts";
import { PromptTemplate } from "../Prompt/PromptTemplate";

class OpenAIModel {
  private modelConfiguration: Configuration;
  public model: OpenAIApi;
  public readonly modelName: string = "text-davinci-003";
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
  async getModelResponse(inputPrompt: string, promptTemplate: PromptTemplate): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("Request Time Out");
      }, 5000);
      const prompt = promptTemplate.getPrompt();

      const response = await this.model.createCompletion({
        model: this.modelName,
        prompt: prompt,
        temperature: this.temperature,
      });
      if (response.data.choices[0].text) resolve(response.data.choices[0].text);
      else reject("No response from model");
    });
  }
}

export { OpenAIModel };

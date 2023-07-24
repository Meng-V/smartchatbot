import { Configuration, OpenAIApi } from "openai";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { ModelPromptWithTools } from "../Prompt/Prompts";

class OpenAIModel {
  private modelConfiguration: Configuration;
  public model: OpenAIApi;
  public readonly modelName: string = "gpt-4-0613";
  private temperature: number;
  private top_p: number;
  private remainingTokens: number = 40000;
  constructor(temperature = 0, top_p = 0.1) {
    this.modelConfiguration = new Configuration({
      organization: "org-4LbKZFYAeYBUivA5qxcat7n6",
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = new OpenAIApi(this.modelConfiguration);
    this.temperature = temperature;
    this.top_p = top_p;
  }
  
  /**
   * This function takes in user input and async return the AIAgent answer
   * @param inputPrompt
   * @returns
   */
  async getModelResponse(promptObject: PromptTemplate): Promise<{ response: string, usage: any }> {
    return new Promise(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject("Request Time Out");
      // }, 5000);
      const prompt = await promptObject.getPrompt();
      const preRequestTokens = this.remainingTokens;
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
        resolve({response: response.data.choices[0].message?.content, usage: usageInfo});
      } else {
        reject("No response from model");
      }
    });
  }
}

export { OpenAIModel };

import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";

class ConversationSummarizePrompt implements PromptTemplate {
  public modelDescription: string;
  public originalConversationString: string;
  constructor() {
    this.modelDescription =
      "You are trying to shorten the following conversation by summarizing it. Include any vital ìnformations in the summary and stress that the latest question is unanswered\n";
    this.originalConversationString = "";
  }

  async getPrompt(): Promise<{prompt: string}> {
    return new Promise<{prompt: string}>((resolve, reject) => {
      resolve({prompt: `${
        this.modelDescription
      }\n${this.originalConversationString}`});
    });
  }

  setConversationMemory(originalConversationString: string): void {
    this.originalConversationString = originalConversationString;
  }
  getSystemDescription(): string {
    return this.modelDescription;
  }
}

export { ConversationSummarizePrompt };

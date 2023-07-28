import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";

class ConversationSummarizePrompt implements PromptTemplate {
  public modelDescription: string;
  public conversationMemory: ConversationMemory | null;
  constructor(conversationMemory: ConversationMemory | null = null) {
    this.modelDescription =
      "You are trying to shorten the following conversation by summarizing it. Please include any vital data in the summarization.\n";
    this.conversationMemory = conversationMemory;
  }

  async getPrompt(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve(
        `${
          this.modelDescription
        }\n${this.conversationMemory?.getConversationAsString()}`,
      );
    });
  }

  setConversationMemory(conversationMemory: ConversationMemory | null) {
    this.conversationMemory = conversationMemory;
  }
  getSystemDescription(): string {
    return this.modelDescription;
  }
}

export { ConversationSummarizePrompt };

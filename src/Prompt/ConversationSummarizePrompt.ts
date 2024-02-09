import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";

/**
 * ConversationSummarizePrompt create prompt to ask the LLM to summarize the current conversation.
 */
class ConversationSummarizePrompt implements PromptTemplate {
  public modelDescription: string;
  public originalConversationString: string;
  constructor() {
    // This prompt is to ask the LLM to summarize the conversation so that the LLM can have the context of the conversation. Then, the LLM can provide better response.
    this.modelDescription =
      "You are trying to shorten the following conversation by summarizing it.Include any vital details like email,name,code,date,etc in the summary.\n";
    this.originalConversationString = "";
  }

  /**
   * Get the prompt to ask the LLM summarize the conversation
   * @returns 
   */
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
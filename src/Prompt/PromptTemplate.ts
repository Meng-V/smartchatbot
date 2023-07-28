import { ConversationMemory } from "../Memory/ConversationMemory";

interface PromptTemplate {
  modelDescription: string;
  getSystemDescription(): string;
  getPrompt(): Promise<string>;
}

export { PromptTemplate };

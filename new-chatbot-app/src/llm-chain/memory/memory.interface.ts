import { TokenUsage } from 'src/shared/services/token-usage/token-usage.service';

export enum Role {
  AIAgent = 'AIAgent',
  Customer = 'Customer',
}

/**
 * This memory and all the relevant indices act as a queue
 */
export interface ConversationMemory {
  /**
   * Set whether or not the object should summarize the conversation
   */
  setConversationSummarizationMode(shouldSummarize: boolean): void;

  /**
   * Get whether or not the object should summarize the conversation
   */
  getConversationSummarizationMode(): boolean;

  /**
   * Add message to conversation.
   * @param role role of the message sender
   * @param message message
   */
  addToConversation(role: Role, message: string): void;

  /**
   * Get the conversation
   * @param start (inclusive) start index of the conversation you want to retrieve. Can be positive or negative. Message at start should happen before message at end. 0: start from the oldest message available. -1: start from the newest message available.
   * @param end (exclusive) end index of the conversation you want to retrieve. Can be positive or negative. Message at start should happen before message at end. 0: end at the oldest message available (exclusive). -1: end at the newest message available.
   * @returns the whole conversation as a string.
   * @throws Error if start and end indices are not appropriate
   */
  getConversationAsString(start: number, end: number): Promise<string>;

  /**
   * Get the total token usage for the whole memory (in case when we use LLM inside this object to summarize the conversation)
   */
  getTokenUsage(): TokenUsage;
}

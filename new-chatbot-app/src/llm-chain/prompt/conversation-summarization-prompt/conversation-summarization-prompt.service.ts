import { Injectable } from '@nestjs/common';
import { Prompt } from '../prompt.interface';

@Injectable()
export class ConversationSummarizationPromptService implements Prompt {
  private modelDescription: string;
  private conversation: string = '';
  constructor() {
    this.modelDescription =
      'You are trying to shorten the following conversation by summarizing it.Include any vital details like email,name,code,date,etc in the summary.\n';
  }
  getSystemDescription(): string {
    return this.modelDescription;
  }

  /**
   * The conversation you wish to summarize
   * @param conversationString
   */
  setConversation(conversationString: string) {
    this.conversation = conversationString;
  }

  getPrompt(): string {
    return this.conversation;
  }
}

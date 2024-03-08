import { Injectable, Scope } from '@nestjs/common';
import { Prompt } from '../prompt.interface';

@Injectable({scope: Scope.TRANSIENT})
export class ConversationSummarizationPromptService implements Prompt {
  private modelDescription: string;
  private conversation: string = '';
  constructor() {
    this.modelDescription =
      'You are trying to shorten the following conversation by summarizing it.Include any vital details like email,name,code,date,etc in the summary.\n';
  }

  public setSystemDescription(systemDescription: string) {
    this.modelDescription = systemDescription;
  }

  public getSystemDescription(): string {
    return this.modelDescription;
  }

  /**
   * The conversation you wish to summarize
   * @param conversationString
   */
  public setConversation(conversationString: string) {
    this.conversation = conversationString;
  }

  public getPrompt(): string {
    return this.conversation;
  }
}

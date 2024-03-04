import { Injectable } from '@nestjs/common';
import { ConversationMemory, Role } from '../memory.interface';
import { CustomQueue } from '../../../shared/custom-data-structures/custome-queue/custom-queue';
import {
  TokenUsage,
  TokenUsageService,
} from '../../../shared/services/token-usage/token-usage.service';
import { ConversationSummarizationPromptService } from '../../prompt/conversation-summarization-prompt/conversation-summarization-prompt.service';
import { LlmService } from '../../../llm-chain/llm/llm.service';
import { OpenAiModelType } from '../../../llm-chain/llm/openai-api/openai-api.service';

@Injectable()
export class ConversationMemoryService implements ConversationMemory {
  private conversationQueue: CustomQueue<[Role | null, string]> =
    new CustomQueue<[Role | null, string]>();

  /**
   * Maximum conversation line would be keep in the memory. Oldest conversation would be tossed if exceed maxContextWindow. In other word, this is the size of the fixed-size queue for the conversation. If null, the queue can grow to whatever size
   */
  private maxContextWindow: number | undefined;
  /**
   * Number of conversation line (most recent) that we would not summarize, allowing model to have the full context of most recent conversation
   */
  private conversationBufferSize: number | undefined;
  private conversationSummarizationMode: boolean = false;
  private tokenUsage: TokenUsage = {};

  constructor(
    private conversationSummarizationPromptService: ConversationSummarizationPromptService,
    private llmService: LlmService,
    private tokenUsageService: TokenUsageService,
  ) {}

  public setConversationSummarizationMode(shouldSummarize: boolean): void {
    this.conversationSummarizationMode = shouldSummarize;
  }

  public getConversationSummarizationMode(): boolean {
    return this.conversationSummarizationMode;
  }

  public setMaxContextWindow(contextWindowSize: number | undefined) {
    this.maxContextWindow = contextWindowSize;
    this.conversationQueue.setMaxSize(this.maxContextWindow);
  }

  public addToConversation(role: Role, message: string): void {
    this.conversationQueue.enqueue([role, message]);
  }

  public setConversationBufferSize(bufferSize: number | undefined) {
    this.conversationBufferSize = bufferSize;
  }

  public getConversationBufferSize(): number | undefined {
    return this.conversationBufferSize;
  }

  /**
   * Turn conversation into a string
   * @param conversation
   * @returns conversation as string
   */
  private stringifyConversation(conversation: [Role | null, string][]): string {
    const conversationString: string = conversation.reduce(
      (prevString: string, curValue: [Role | null, string]) => {
        const role: string = curValue[0] as string;
        const response: string = curValue[1];
        return prevString + `${role}: ${response}\n`;
      },
      '',
    );
    return conversationString;
  }

  /**
   * Summarize the input conversation
   * @param conversation
   * @returns
   */
  private async summarizeConversation(
    conversation: [Role | null, string][],
  ): Promise<string> {
    return new Promise<string>(async (resolve, rejects) => {
      if (conversation.length === 0) {
        resolve('');
        return;
      }

      const conversationString = this.stringifyConversation(conversation);
      this.conversationSummarizationPromptService.setConversation(
        conversationString,
      );
      const {
        response: conversationSummary,
        tokenUsage: tokenUsageFromSummarization,
      } = await this.llmService.getModelResponse(
        this.conversationSummarizationPromptService,
        OpenAiModelType.GPT_3_5_TURBO,
      );

      //Update TokenUsage information
      this.tokenUsage = this.tokenUsageService.combineTokenUsage(
        tokenUsageFromSummarization,
        this.tokenUsage,
      );
      resolve(this.stringifyConversation(conversation));
    });
  }

  public getConversationAsString(start: number, end: number): Promise<string> {
    return new Promise<string>(async (resolve, rejects) => {
      const slicedConversation = this.conversationQueue.slice(start, end);

      //If bufferSize is undefined, we don't summarize anything
      const conversationToUnchange =
        this.conversationBufferSize !== undefined
          ? slicedConversation.slice((start = -this.conversationBufferSize))
          : slicedConversation;
      const conversationToSummarize =
        this.conversationBufferSize !== undefined
          ? slicedConversation.slice(
              (start = 0),
              (end = -this.conversationBufferSize),
            )
          : [];

      const conversationSummary = this.summarizeConversation(
        conversationToSummarize,
      );

      resolve(
        `${conversationSummary}\n${this.stringifyConversation(conversationToUnchange)}`,
      );
    });
  }

  public getTokenUsage(): TokenUsage {
    return {
      'gpt-4-0314': {
        totalTokens: 0,
        completionTokens: 0,
        promptTokens: 0,
      },
    };
  }
}

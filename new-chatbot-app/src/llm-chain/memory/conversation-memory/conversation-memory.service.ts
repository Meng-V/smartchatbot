import { Injectable, Scope } from '@nestjs/common';
import { ConversationMemory, Role } from '../memory.interface';
import { CustomQueue } from '../../../shared/custom-data-structures/custome-queue/custom-queue';
import {
  TokenUsage,
  TokenUsageService,
} from '../../../shared/services/token-usage/token-usage.service';
import { ConversationSummarizationPromptService } from '../../prompt/conversation-summarization-prompt/conversation-summarization-prompt.service';
import { LlmService } from '../../../llm-chain/llm/llm.service';
import { OpenAiModelType } from '../../../llm-chain/llm/openai-api/openai-api.service';

@Injectable({ scope: Scope.REQUEST })
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

  /**
   * True: will summarize the conversation based on maxContextWindow and conversationBufferSize. False: will not summarize
   */
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

  /**
   * Set max context window for the memory
   * @param contextWindowSize
   * @throw Error in case contextWindowSize < conversation buffer size (if defined)
   */
  public setMaxContextWindow(contextWindowSize: number | undefined) {
    if (
      contextWindowSize !== undefined &&
      this.conversationBufferSize !== undefined &&
      contextWindowSize < this.conversationBufferSize
    ) {
      throw new Error(
        'Context window size cannot be smaller than conversation buffer size',
      );
    }

    this.maxContextWindow = contextWindowSize;
    this.conversationQueue.setMaxSize(this.maxContextWindow);
  }

  public getMaxContextWindow(): number | undefined {
    return this.maxContextWindow;
  }

  public addToConversation(role: Role, message: string): void {
    this.conversationQueue.enqueue([role, message]);
  }

  /**
   *
   * @param bufferSize
   * @throws Error in case bufferSize is larger than this.maxContextWindow(if defined)
   */
  public setConversationBufferSize(bufferSize: number | undefined) {
    if (
      bufferSize !== undefined &&
      this.maxContextWindow !== undefined &&
      bufferSize > this.maxContextWindow
    ) {
      throw new Error(
        'Conversation Buffer size cannot be larger than max context window',
      );
    }

    this.conversationBufferSize = bufferSize;
  }

  public getConversationBufferSize(): number | undefined {
    return this.conversationBufferSize;
  }

  private setTokenUsage(tokenUsage: TokenUsage) {
    this.tokenUsage = tokenUsage;
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
      this.setTokenUsage(
        this.tokenUsageService.combineTokenUsage(
          tokenUsageFromSummarization,
          this.getTokenUsage(),
        ),
      );

      resolve(conversationSummary);
    });
  }
  /**
   * get 
   * @param start The beginning index of the specified portion of the array. If start is undefined, then the slice begins at index 0.

    * @param end The end index of the specified portion of the array. This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the array.
   * @returns 
   */
  public async getConversationAsString(
    start: number = 0,
    end?: number,
  ): Promise<string> {
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

      const conversationSummary = this.conversationSummarizationMode
        ? await this.summarizeConversation(conversationToSummarize)
        : this.stringifyConversation(conversationToSummarize);

      resolve(
        `${conversationSummary}\n${this.stringifyConversation(conversationToUnchange)}`,
      );
    });
  }

  public getTokenUsage(): TokenUsage {
    return this.tokenUsage;
  }
}

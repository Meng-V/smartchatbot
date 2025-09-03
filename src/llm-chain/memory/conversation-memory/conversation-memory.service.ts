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

@Injectable({ scope: Scope.DEFAULT })
export class ConversationMemoryService implements ConversationMemory {
  // Map to store conversation memory per client/conversation ID
  private conversationMemories: Map<
    string,
    {
      conversationQueue: CustomQueue<[Role | null, string]>;
      maxContextWindow: number | undefined;
      conversationBufferSize: number | undefined;
      conversationSummarizationMode: boolean;
      tokenUsage: TokenUsage;
    }
  > = new Map();

  private currentConversationId: string | null = null;

  constructor(
    private conversationSummarizationPromptService: ConversationSummarizationPromptService,
    private llmService: LlmService,
    private tokenUsageService: TokenUsageService,
  ) {}

  // Set conversation ID for current operations
  public setConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
    if (!this.conversationMemories.has(conversationId)) {
      this.conversationMemories.set(conversationId, {
        conversationQueue: new CustomQueue<[Role | null, string]>(),
        maxContextWindow: undefined,
        conversationBufferSize: undefined,
        conversationSummarizationMode: false,
        tokenUsage: {},
      });
    }
  }

  private getCurrentMemory() {
    if (
      !this.currentConversationId ||
      !this.conversationMemories.has(this.currentConversationId)
    ) {
      throw new Error('No conversation ID set or conversation not found');
    }
    return this.conversationMemories.get(this.currentConversationId)!;
  }

  public setConversationSummarizationMode(shouldSummarize: boolean): void {
    const memory = this.getCurrentMemory();
    memory.conversationSummarizationMode = shouldSummarize;
  }

  public getConversationSummarizationMode(): boolean {
    const memory = this.getCurrentMemory();
    return memory.conversationSummarizationMode;
  }

  /**
   * Set max context window for the memory
   * @param contextWindowSize
   * @throw Error in case contextWindowSize < conversation buffer size (if defined)
   */
  public setMaxContextWindow(contextWindowSize: number | undefined) {
    const memory = this.getCurrentMemory();
    if (
      contextWindowSize !== undefined &&
      memory.conversationBufferSize !== undefined &&
      contextWindowSize < memory.conversationBufferSize
    ) {
      throw new Error(
        'Context window size cannot be smaller than conversation buffer size',
      );
    }

    memory.maxContextWindow = contextWindowSize;
    memory.conversationQueue.setMaxSize(memory.maxContextWindow);
  }

  public getMaxContextWindow(): number | undefined {
    const memory = this.getCurrentMemory();
    return memory.maxContextWindow;
  }

  public addToConversation(role: Role, message: string): void {
    const memory = this.getCurrentMemory();
    memory.conversationQueue.enqueue([role, message]);
  }

  /**
   *
   * @param bufferSize
   * @throws Error in case bufferSize is larger than this.maxContextWindow(if defined)
   */
  public setConversationBufferSize(bufferSize: number | undefined) {
    const memory = this.getCurrentMemory();
    if (
      bufferSize !== undefined &&
      memory.maxContextWindow !== undefined &&
      bufferSize > memory.maxContextWindow
    ) {
      throw new Error(
        'Conversation Buffer size cannot be larger than max context window',
      );
    }

    memory.conversationBufferSize = bufferSize;
  }

  public getConversationBufferSize(): number | undefined {
    const memory = this.getCurrentMemory();
    return memory.conversationBufferSize;
  }

  private setTokenUsage(tokenUsage: TokenUsage) {
    const memory = this.getCurrentMemory();
    memory.tokenUsage = tokenUsage;
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
    if (conversation.length === 0) {
      return '';
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
      OpenAiModelType.GPT_o4_mini,
    );

    //Update TokenUsage information
    this.setTokenUsage(
      this.tokenUsageService.combineTokenUsage(
        tokenUsageFromSummarization,
        this.getTokenUsage(),
      ),
    );

    return conversationSummary;
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
    const memory = this.getCurrentMemory();
    const slicedConversation = memory.conversationQueue.slice(start, end);

    //If bufferSize is undefined, we don't summarize anything
    const conversationToUnchange =
      memory.conversationBufferSize !== undefined
        ? slicedConversation.slice((start = -memory.conversationBufferSize))
        : slicedConversation;
    const conversationToSummarize =
      memory.conversationBufferSize !== undefined
        ? slicedConversation.slice(
            (start = 0),
            (end = -memory.conversationBufferSize),
          )
        : [];

    const conversationSummary = memory.conversationSummarizationMode
      ? await this.summarizeConversation(conversationToSummarize)
      : this.stringifyConversation(conversationToSummarize);

    return `${conversationSummary}\n${this.stringifyConversation(conversationToUnchange)}`;
  }

  /**
   * Get the total token usage used for this memory so far
   * @returns
   */
  public getTokenUsage(): TokenUsage {
    const memory = this.getCurrentMemory();
    return memory.tokenUsage;
  }

  // Clean up conversation memory when client disconnects
  public clearConversation(conversationId: string): void {
    this.conversationMemories.delete(conversationId);
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }
}

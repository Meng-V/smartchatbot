import { Injectable, Scope } from '@nestjs/common';
import { LlmService } from './llm/llm.service';
import { ChatbotConversationPromptWithToolsService } from './prompt/chatbot-conversation-prompt-with-tools/chatbot-conversation-prompt-with-tools.service';
import { ConversationMemoryService } from './memory/conversation-memory/conversation-memory.service';
import { Role } from './memory/memory.interface';
import { OpenAiModelType } from './llm/openai-api/openai-api.service';
import {
  TokenUsage,
  TokenUsageService,
} from '../shared/services/token-usage/token-usage.service';

/**
 * Service for using the LLM Chain
 */
@Injectable({ scope: Scope.REQUEST })
export class LlmChainService {
  totalLlmTokenUsage: TokenUsage = {};
  constructor(
    private llmService: LlmService,
    private promptService: ChatbotConversationPromptWithToolsService,
    private memoryService: ConversationMemoryService,
    private tokenUsageService: TokenUsageService,
  ) {
    this.memoryService.setMaxContextWindow(6);
    this.memoryService.setConversationBufferSize(3);
    this.memoryService.setConversationSummarizationMode(true);
    this.promptService.setConversationMemory(memoryService);
  }

  /**
   * Get model response
   * @param userMessage
   * @returns model response
   */
  public async getModelResponse(userMessage: string): Promise<string> {
    this.memoryService.addToConversation(Role.Customer, userMessage);
    const { response, tokenUsage } = await this.llmService.getModelResponse(
      this.promptService,
      OpenAiModelType.GPT_4_TURBO,
    );

    //Add AI response to conversation
    this.memoryService.addToConversation(Role.AIAgent, response);

    //Update total llm token usage
    this.totalLlmTokenUsage = this.tokenUsageService.combineTokenUsage(
      this.totalLlmTokenUsage,
      tokenUsage,
    );

    return response;
  }

  public getTokenUsage(): TokenUsage {
    return this.tokenUsageService.combineTokenUsage(
      this.totalLlmTokenUsage,
      this.memoryService.getTokenUsage(),
    );
  }
}

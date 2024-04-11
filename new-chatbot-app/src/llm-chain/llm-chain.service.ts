import { Injectable, OnModuleInit, Scope } from '@nestjs/common';
import { LlmService } from './llm/llm.service';
import { ChatbotConversationPromptWithToolsService } from './prompt/chatbot-conversation-prompt-with-tools/chatbot-conversation-prompt-with-tools.service';
import { ConversationMemoryService } from './memory/conversation-memory/conversation-memory.service';
import { Role } from './memory/memory.interface';
import { OpenAiModelType } from './llm/openai-api/openai-api.service';
import { LlmAnswerParserService } from './llm-answer-parser/llm-answer-parser.service';
import { LlmTool } from './llm-toolbox/llm-tool.interface';
import { LibrarianSubjectLookupToolService } from './llm-toolbox/libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import {
  TokenUsage,
  TokenUsageService,
} from '../shared/services/token-usage/token-usage.service';
import { LlmModelType } from './llm/llm.module';
import { CitationAssistToolService } from './llm-toolbox/citation-assist-tool/citation-assist-tool.service';
import { CheckRoomAvailabilityToolService } from './llm-toolbox/libcal-tools/check-room-availability-tool/check-room-availability-tool.service';
import { ReserveRoomToolService } from './llm-toolbox/libcal-tools/reserve-room-tool/reserve-room-tool.service';

/**
 * Service for using the LLM Chain
 */
@Injectable({ scope: Scope.REQUEST })
export class LlmChainService {
  private readonly LLM_CALL_LIMIT = 5;
  private readonly LLM_TYPE_TO_USE: LlmModelType =
    OpenAiModelType.GPT_3_5_TURBO;
  private totalLlmTokenUsage: TokenUsage = {};

  private toolsMap: Map<string, LlmTool> = new Map<string, LlmTool>();

  constructor(
    private llmService: LlmService,
    private promptService: ChatbotConversationPromptWithToolsService,
    private memoryService: ConversationMemoryService,
    private llmAnswerParserService: LlmAnswerParserService,
    private tokenUsageService: TokenUsageService,
    private librarianSubjectLookupToolService: LibrarianSubjectLookupToolService,
    private citationAssistToolService: CitationAssistToolService,
    private checkRoomAvailabilityToolService: CheckRoomAvailabilityToolService,
    private reserveRoomToolService: ReserveRoomToolService,
  ) {
    this.memoryService.setMaxContextWindow(6);
    this.memoryService.setConversationBufferSize(3);
    this.memoryService.setConversationSummarizationMode(true);
    this.promptService.setConversationMemory(this.memoryService);

    this.setAvailableTools(
      new Set<LlmTool>([
        this.librarianSubjectLookupToolService,
        this.citationAssistToolService,
        this.checkRoomAvailabilityToolService,
        this.reserveRoomToolService,
      ]),
    );
  }

  /**
   * This would set the tools for the llm to use
   * @param llmToolSet
   */
  private setAvailableTools(llmToolSet: Set<LlmTool>): void {
    llmToolSet.forEach((llmTool) => {
      this.toolsMap.set(llmTool.toolName, llmTool);
    });

    this.promptService.setTools([...llmToolSet]);
  }

  /**
   * This function help the agent call the available tools with the appropriate parameters
   * @param toolName name of the tool you would use
   * @param toolInput { [paramName: string]: string } parameter and their value
   * @returns the returned string from the tool
   */
  private async accessToolBox(
    toolName: string,
    toolInput: { [key: string]: string },
  ): Promise<string> {
    if (this.toolsMap.has(toolName)) {
      const tool = this.toolsMap.get(toolName)!;

      let toolRespose;
      try {
        toolRespose = await tool.toolRunForLlm(toolInput);
      } catch (error) {
        throw error;
      }
      return toolRespose;
    } else {
      throw new Error('Tool does not exist');
    }
  }

  /**
   * Get model response
   * @param userMessage
   * @returns model response. Format: Array with each element is a line of answer
   */
  public async getModelResponse(userMessage: string): Promise<string> {
    this.memoryService.addToConversation(Role.Customer, userMessage);
    let { response: llmResponse, tokenUsage } =
      await this.llmService.getModelResponse(
        this.promptService,
        this.LLM_TYPE_TO_USE,
      );

    let outputParsed = this.llmAnswerParserService.parseLLMOutput(llmResponse);
    let llmCallNum = 1;

    // Handle cases when model doesn't output either actions and final answer
    while (outputParsed.outputType !== 'final') {
      if (llmCallNum > this.LLM_CALL_LIMIT) {
        throw new Error('Too many LMM Calls. Possible inifinity loop');
      }

      //Update total llm token usage
      this.totalLlmTokenUsage = this.tokenUsageService.combineTokenUsage(
        this.totalLlmTokenUsage,
        tokenUsage,
      );

      this.promptService.updateScratchpad(`Thought: ${outputParsed.thought}\n`);
      this.promptService.updateScratchpad(`Action: ${outputParsed.action}\n`);
      this.promptService.updateScratchpad(
        `Action Input: ${JSON.stringify(outputParsed.actionInput)}\n`,
      );
      const toolResponse = await this.accessToolBox(
        outputParsed.action,
        outputParsed.actionInput,
      );

      this.promptService.updateScratchpad(`Tool Response: ${toolResponse}`);

      //Get answer from the llm again with the new information from tools
      ({ response: llmResponse, tokenUsage } =
        await this.llmService.getModelResponse(
          this.promptService,
          this.LLM_TYPE_TO_USE,
        ));
      outputParsed = this.llmAnswerParserService.parseLLMOutput(llmResponse);

      llmCallNum++;
    }

    //Add AI response to conversation
    this.memoryService.addToConversation(Role.AIAgent, llmResponse);

    //Update total llm token usage
    this.totalLlmTokenUsage = this.tokenUsageService.combineTokenUsage(
      this.totalLlmTokenUsage,
      tokenUsage,
    );

    return outputParsed.finalAnswer;
  }

  /**
   * Get the total token usage for the whole conversation so far
   * @returns total TokenUsage
   */
  public getTokenUsage(): TokenUsage {
    const totalTokenUsageFromMemory = this.memoryService.getTokenUsage();
    const totalTokenUsage = this.tokenUsageService.combineTokenUsage(
      this.totalLlmTokenUsage,
      totalTokenUsageFromMemory,
    );
    return totalTokenUsage;
  }
}

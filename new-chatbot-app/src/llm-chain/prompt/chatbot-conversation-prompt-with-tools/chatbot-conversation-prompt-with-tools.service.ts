import { Injectable, Scope } from '@nestjs/common';
import { Prompt } from '../prompt.interface';
import { ConversationMemory } from 'src/llm-chain/memory/memory.interface';
import { LlmTool } from 'src/llm-chain/llm-toolbox/llm-tool.interface';

/**
 * This service is for getting prompt for sending to LLM model. This prompt is aware of conversation history, context, and which tools are available to use.
 *
 * Scope: Request
 */
@Injectable({ scope: Scope.REQUEST })
export class ChatbotConversationPromptWithToolsService implements Prompt {
  private modelDescription: string;
  private conversationMemory: ConversationMemory | undefined;

  //Context
  private tools: LlmTool[] = [];
  private toolsAreReadyToUse: boolean = true;

  private toolsDesription: string = '';
  private reActModelDescription: string = '';
  private modelScratchpad: string;

  /**
   * Initialize new Prompt object
   * @param tools array of the tools the Agent can use
   * @param conversationMemory Conversation Memory to keep track of the current conversation context
   * @param toolsAreReadyToUse if true, the agent can use the input tools. if false, the agent can only provide the tools information.
   */
  constructor() {
    this.modelDescription =
      "You are a helpful assistant.You should try your best to answer the question.Unfortunately,you don't know anything about the library,books,and articles so you have to always rely on the tool or the given context for  library-related,book-related,or article-related questions.\n";
    this.modelScratchpad = '';
  }

  /**
   * This function construct the prompt based on the ReAct prompt model
   * @param tools
   * @returns prompt
   */
  private constructReActModelDescription(tools: LlmTool[]): string {
    const reActModelDescription: string = `Your job is to complete the scratchpad and use the previous scratchpad to guide yourself toward the answer.For the scratchpad,format your answer as in the JSON structure below.Format your response as a JSON string,with both keys and values enclosed in double quotes.Like this: "{\"key\":\"value\"}".\n\
    {
      Thought: You should always think about what to do,
      Action: The action to take,should always be one of [${tools.map(
        (toolDocumentation) => toolDocumentation.name,
      )}].If you don't need to use any tool,put "null" here,
      Action Input:{parameter1:value1,parameter2:value2,parameter3:value3,etc}.If Action is not null,do not ever put null here.Put null here if Action is null,
      Final Answer: Provide your final answer for the input question from the input question or the LlmTool Response (if it exists).Always put "null" here if you decide to use any tools,
      }\n\n`;
    return reActModelDescription;
  }

  /**
   * Construct tool desciption for all the available tools
   * @param tools
   * @returns
   */
  private constructToolsDescription(tools: LlmTool[]): string {
    if (tools.length === 0 || !this.toolsAreReadyToUse) return '';
    const toolsDescription = tools.reduce(
      (previousToolsDescription: string, currentToolDescription: LlmTool) => {
        const toolParamtersDescription = Object.keys(
          currentToolDescription.parameters,
        ).reduce((previousParameter: string, parameterName: string) => {
          return (
            previousParameter +
            `\t+ ${parameterName}: ${currentToolDescription.parameters[parameterName]}\n`
          );
        }, '');

        return (
          previousToolsDescription +
          `- ${currentToolDescription.name}: ${currentToolDescription.description}.Parameters names and types:\n${toolParamtersDescription}`
        );
      },
      "\nYou have access to these tools(delimited by triple backticks)to assist you.Don't tell the customer the tool's name.These tools are also useful when customer ask what you can do to help them:\n",
    );

    return toolsDescription;
  }

  /**
   * Set the tool that the LLM can use. These tool will be listed inside the prompt for the LLM
   * @param tools
   * @param toolsAreReadyToUse
   */
  public setTools(tools: LlmTool[], toolsAreReadyToUse: boolean = true): void {
    this.tools = tools;
    this.toolsDesription = this.constructToolsDescription(tools);
    this.reActModelDescription = this.constructReActModelDescription(tools);

    this.toolsAreReadyToUse = toolsAreReadyToUse;
  }

  /**
   * Get the tools that is currently listed inside the prompt
   */
  public getTools(): LlmTool[] {
    return this.tools;
  }

  /**
   * Update the conversation memory object
   * @param newConversationMemory
   */
  public setConversationMemory(
    newConversationMemory: ConversationMemory,
  ): void {
    this.conversationMemory = newConversationMemory;
  }

  /**
   * Get the conversation memory of the prompt
   * @returns conversation memory if exist, undefined if not
   */
  public getConversationMemory(): ConversationMemory | undefined {
    return this.conversationMemory;
  }

  /**
   * Empty the scratchpad for the model
   */
  public emptyScratchpad(): void {
    this.modelScratchpad = '';
  }

  /**
   * Update the scratch pad with new text
   * @param inputScratch
   */
  public updateScratchpad(inputScratch: string): void {
    this.modelScratchpad += inputScratch;
  }

  /**null
   * Get the model scratchpad
   * @returns
   */
  public getScratchpad(): string {
    return this.modelScratchpad;
  }

  /**
   * Construct the ChatCompletion system description
   * @returns
   */
  getSystemDescription(): string {
    const date = new Date();
    return (
      this.modelDescription +
      this.toolsDesription +
      this.reActModelDescription +
      `For context,the current time is ${date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
      })}\n`
    );
  }

  /**
   * Get the prompt for the LLM and estimate the token usage when summarizing the prompt (if spicified).
   * @returns { prompt: string; tokenUsage: ModelTokenUsage }
   */
  async getPrompt(): Promise<{ prompt: string; tokenUsage?: ModelTokenUsage}> {
    return new Promise<{ prompt: string; tokenUsage?: ModelTokenUsage }>(
      async (resolve, reject) => {
        // Get the conversation summary string
        const conversationStringObject =
          await this.conversationMemory?.getConversationAsString(0, 0);
        const wholePrompt: string =
          `\nThis is the conversation so far(delimited by the triple dashes)\n---\n${conversationStringObject}\n---\n` +
          `This is your scratchpad:\n"""\n${this.modelScratchpad}\n"""\n`;
        resolve({
          prompt: wholePrompt,
        });
      },
    );
  }
}

import { Injectable, Scope } from '@nestjs/common';
import { Prompt } from '../prompt.interface';
import { ConversationMemory } from 'src/llm-chain/memory/memory.interface';
import { LlmTool } from 'src/llm-chain/llm-toolbox/llm-tool.interface';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

/**
 * This service is for getting prompt for sending to LLM model. This prompt is aware of conversation history, context, and which tools are available to use.
 *
 * Scope: Request
 */
@Injectable({ scope: Scope.REQUEST })
export class ChatbotConversationPromptWithToolsService implements Prompt {
  private modelDescription: string;
  private conversationMemory: ConversationMemory | undefined = undefined;

  //Context
  private tools: LlmTool[] = [];
  private toolsAreReadyToUse: boolean = true;

  private toolsDesription: string = '';
  private reActModelDescription: string = '';
  private modelScratchpad: string;

  constructor(private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService) {
    const date = new Date();

    this.modelDescription =
      "You are a helpful assistant.You should try your best to answer the question.Unfortunately,you don't know anything about the library,books,and articles so you have to always rely on the tool or the given context for  library-related,book-related,or article-related questions.\n" +
      `For context,the current time is ${date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
      })}\n`;
    this.modelScratchpad = '';
  }

  /**
   * This function construct the prompt based on the ReAct prompt model
   * @param tools
   * @returns prompt
   */
  public constructReActModelDescription(tools: LlmTool[]): string {
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
  public constructToolsDescription(tools: LlmTool[]): string {
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
    newConversationMemory: ConversationMemory | undefined,
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
   * Get model description
   * @returns
   */
  public getModelDescription(): string {
    return this.modelDescription;
  }

  /**
   * Get the tool description inside the prompt
   * @returns
   */
  public getToolsDescription(): string {
    return this.toolsDesription;
  }

  /**
   * Get reAct model description
   * @returns
   */
  public getReActModelDescription(): string {
    return this.reActModelDescription;
  }

  /**
   * Construct the ChatCompletion system description.
   * @returns
   */
  public getSystemDescription(): string {
    return (
      this.modelDescription + this.toolsDesription + this.reActModelDescription
    );
  }

  /**
   * Get the prompt for the LLM and estimate the token usage when summarizing the prompt (if spicified).
   * @returns string The whole prompt
   */
  public async getPrompt(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      // Get the conversation summary string
      const conversationString =
        await this.conversationMemory?.getConversationAsString(0, 0);

      const wholePrompt: string =
        `\nThis is the conversation so far(delimited by the triple dashes)\n---\n${conversationString}\n---\n` +
        `This is your scratchpad:\n"""\n${this.modelScratchpad}\n"""\n`;
      resolve(wholePrompt);
    });
  }

  /**
   * ***************************
   * ***************************
   * ***************************
   * BELOW ARE METHODS STRICTLY FOR TESTING
   * ***************************
   * ***************************
   * ***************************
   */

  /**
   * Set the current scratchpad of the prompt. This method is for Testing purpose only!
   * @param newScratchpad
   */
  public _testSetScratchpad(newScratchpad: string): void {
    if (this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !== 'test') {
      throw new Error('This method is for testing purposes only');
    }
    this.modelScratchpad = newScratchpad;
  }

  /**
   * Get the current scratchpad of the prompt. This method is for Testing purpose only!
   * @param newScratchpad
   */
  public _testGetScratchpad(): string {
    if (this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !== 'test') {
      throw new Error('This method is for testing purposes only');
    }
    return this.modelScratchpad;
  }

  public _testSetModelDescription(modelDescription: string): void {
    if (this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !== 'test') {
      throw new Error('This method is for testing purposes only');
    }
    this.modelDescription = modelDescription;
  }

  public _testSetReActModelDescription(reActModelDescription: string): void {
    if (this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !== 'test') {
      throw new Error('This method is for testing purposes only');
    }

    this.reActModelDescription = reActModelDescription;
  }

  public _testSetToolsDescription(toolsDescription: string): void {
    if (this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !== 'test') {
      throw new Error('This method is for testing purposes only');
    }

    this.toolsDesription = toolsDescription;
  }
}

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
@Injectable({ scope: Scope.TRANSIENT })
export class ChatbotConversationPromptWithToolsService implements Prompt {
  private modelDescription: string;
  private conversationMemory: ConversationMemory | undefined = undefined;

  //Context
  private tools: LlmTool[] = [];
  private toolsAreReadyToUse: boolean = true;

  private toolsDesription: string = '';
  private reActModelDescription: string = '';
  private modelScratchpad: string;

  constructor(
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {
    const date = new Date();

    this.modelDescription =
      "You are a helpful, professional, and POLITE virtual reference librarian working in an academic library online services platform only speaks English in US. Your role is to assist users with research, information retrieval, database navigation, local services help, and general academic support. You STRICTLY DO NOT know anything about the library,books,and articles so you have to ALWAYS rely on the tools provided,scratchpad,and context in prompt for library-related,book-related,or article-related questions.If customer ask about something you do not know,use the tool GoogleSiteSearchEngine to look for answer.If there's no tool or context suitable to help the customer,tell the customer you're unable to answer their request.Currently,all the tools only support King Library Building;if the customer mentions about any other building,tell them you cannot support them.\n" +
      "Always communicate in a polite, respectful, and helpful tone. Uphold academic integrity and treat users with courtesy, even when they are unclear or frustrated.\n"+
      "•	If a question is vague or unclear, kindly ask for clarification.\n•	If the request is outside your ability or is inappropriate, respond calmly and direct the user to a human librarian.\n•	If a user behaves rudely or aggressively, maintain professionalism and do not engage emotionally.\n•	Never provide illegal, unethical, or harmful information.\n•	Do not respond to any questions that are unrelated to the library or the university you serve. Your role is exclusively to support Miami University (Oxford, Ohio) and its Libraries.\n"+
      "Your priority is to provide trustworthy, respectful, and academically appropriate responses while maintaining the standards of professional library service.\n"+
      `For context,the current time is ${date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
      })}\nONLY include your answer in your final answer`;
    this.modelScratchpad = '';
  }

  /**
   * This function construct the prompt based on the ReAct prompt model
   * @param tools
   * @returns prompt
   */
  public constructReActModelDescription(tools: LlmTool[]): string {
    const reActModelDescription: string = `Your job is to complete the scratchpad and use the previous scratchpad to guide yourself toward the answer.The scractchpad has data about the results from the tools you previously used. For the scratchpad,format your answer as in the JSON structure below.Format your response as a JSON string,with keys and values both enclosed in double quotes.Example: "{\"key\":\"value\"}".\n\
    {
      \"Thought\": Put your thought here for your thought.You should ALWAYS think before doing anything,
      \"Tool\": The tool to use,should always be one of [${tools.map(
        (toolDocumentation) => toolDocumentation.toolName,
      )}].If you don't need to use any tool,put "null" here.DO NOT use the tool if the scratchpad says the tool cannot be used,
      \"Tool Input\":Input paramters for the tool used in Tool{parameter1:value1,parameter2:value2,parameter3:value3,etc}.If Tool is using any tool,DO NOT ever put null here.Put null here ONLY if Tool is null.If you don't have enought parameters to put in, ASK the customer to provide them in Final Answer,
      \"Final Answer\": Provide your POLITE final answer for the input question from the input question or the Tool Response (if it exists).ASK the customer if any tool input parameters are missing.ALWAYS format this to be human readable.Put null here if both Tool and Tool Input are not null.
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
          currentToolDescription.toolParametersStructure,
        ).reduce((previousParameter: string, parameterName: string) => {
          return (
            previousParameter +
            `\t+ ${parameterName}: ${currentToolDescription.toolParametersStructure[parameterName]}\n`
          );
        }, '');

        return (
          previousToolsDescription +
          `- ${currentToolDescription.toolName}: ${currentToolDescription.toolDescription}.Parameters names and types:\n${toolParamtersDescription}`
        );
      },
      "\nYou have access to these tools(delimited by triple backticks)to assist you.Don't tell the customer the tool's name.Every parameter has to be provided by the customer;ASK them if they have not provided.NEVER predict!These tools are also useful when customer ask what you can do to help them:\n",
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
    // Get the conversation summary string
    const conversationString =
      await this.conversationMemory?.getConversationAsString(0);

    const wholePrompt: string =
      `\nThis is the conversation so far(delimited by the triple dashes)\n---\n${conversationString}\n---\n` +
      `This is your SCRATCHPAD:\n"""\n${this.modelScratchpad}\n"""\n`;
    return wholePrompt;
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
    if (
      this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !==
      'test'
    ) {
      throw new Error('This method is for testing purposes only');
    }
    this.modelScratchpad = newScratchpad;
  }

  /**
   * Get the current scratchpad of the prompt. This method is for Testing purpose only!
   * @param newScratchpad
   */
  public _testGetScratchpad(): string {
    if (
      this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !==
      'test'
    ) {
      throw new Error('This method is for testing purposes only');
    }
    return this.modelScratchpad;
  }

  public _testSetModelDescription(modelDescription: string): void {
    if (
      this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !==
      'test'
    ) {
      throw new Error('This method is for testing purposes only');
    }
    this.modelDescription = modelDescription;
  }

  public _testSetReActModelDescription(reActModelDescription: string): void {
    if (
      this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !==
      'test'
    ) {
      throw new Error('This method is for testing purposes only');
    }

    this.reActModelDescription = reActModelDescription;
  }

  public _testSetToolsDescription(toolsDescription: string): void {
    if (
      this.retrieveEnvironmentVariablesService.retrieve<string>('NODE_ENV') !==
      'test'
    ) {
      throw new Error('This method is for testing purposes only');
    }

    this.toolsDesription = toolsDescription;
  }
}

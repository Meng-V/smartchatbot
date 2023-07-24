import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";
import { Tool } from "../ToolBox/ToolTemplates";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationSummarizePrompt } from "./ConversationSummarizePrompt";

class ModelPromptWithTools implements PromptTemplate {
  public modelDescription: string;
  public conversationMemory: ConversationMemory | null;

  //Context
  private tools: Tool[];
  private toolsDesription: string;
  private reActModelDescription: string;
  private modelScratchpad: string;

  /**
   * Initialize new Prompt object
   * @param tools
   * @param llmModel Used for shorten the conversation memory to reduce token number used
   * @param conversationMemory
   * @param promptTokenLimit
   */
  constructor(
    tools: Tool[],
    conversationMemory: ConversationMemory | null = null,
  ) {
    this.modelDescription =
      "You are a helpful assistant. You should try your best to answer the question. Unfortunately, you don't know anything about the library, books, and articles so you have to always rely on the tool or the given context for  library-related, book-related, or article-related questions.\n";

    this.conversationMemory = conversationMemory;

    this.tools = tools;
    this.toolsDesription = this.constructToolsDescription(this.tools);

    this.reActModelDescription = this.constructReActModelDescription(tools);
    this.modelScratchpad = "";

  }

  private constructReActModelDescription(tools: Tool[]): string {
    const reActModelDescription: string = `Your job is to complete the scratchpad to guide yourself toward the answer. For the scratchpad, format your answer as in the JSON structure below. Format your response as a JSON string, with both keys and values enclosed in double quotes. Like this: "{\"key\": \"value\"}".\n\
    {
      Thought: You should always think about what to do,
      Action: The action to take, should always be one of [${tools.map(
        (toolDocumentation) => toolDocumentation.name
      )}]. If you don't need to use any tool, put "null" here,
      Action Input: {parameter1: value1, parameter2: value2, parameter3: value3, etc}. If Action is not null, do not ever put null here. Put null here if Action is null,
      Final Answer: Provide your final answer for the input question from the input question or the Observation (if it exists). Put "null" here if you decide to use any tools,
      }\n\n`;
    return reActModelDescription;
  }
  private constructToolsDescription(tools: Tool[]) {
    const toolsDescription = tools.reduce(
      (previousToolsDescription: string, currentToolDescription: Tool) => {
        const toolParamtersDescription = Object.keys(
          currentToolDescription.parameters
        ).reduce((previousParameter: string, parameterName: string) => {
          return (
            previousParameter +
            `\t+ ${parameterName}: ${currentToolDescription.parameters[parameterName]}\n`
          );
        }, "");

        return (
          previousToolsDescription +
          `- ${currentToolDescription.name}: ${currentToolDescription.description}. Parameters names and types:\n${toolParamtersDescription}`
        );
      },
      "\nYou have access to these tools (delimited by triple backticks) to assist you. These tools are also useful when customer ask what you can do to help them:\n"
    );

    return toolsDescription;
  }

  public updateConversationMemory(
    newConversationMemory: ConversationMemory | null
  ): void {
    this.conversationMemory = newConversationMemory;
  }

  public emptyScratchpad(): void {
    this.modelScratchpad = "";
  }

  public updateScratchpad(inputScratch: string): void {
    this.modelScratchpad += inputScratch;
  }

  public getScratchpad(): string {
    return this.modelScratchpad;
  }

  getSystemDescription(): string {
    const date = new Date();
    return (
      this.modelDescription +
      this.toolsDesription +
      this.reActModelDescription +
      `For context, the current time is ${date.toLocaleString("en-US", {
        timeZone: "America/New_York",
      })}\n`
    );
  }
  async getPrompt(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const wholePrompt: string =
        `\nThis is the conversation so far (delimited by the triple dashes):\n---\n${await this.conversationMemory?.getConversationAsString()}\n---\n` +
        `This is your scratchpad:\n"""\n${this.modelScratchpad}\n"""\n`;
      // console.log(wholePrompt);
      resolve(wholePrompt);
    })
      
  }
}

export { ModelPromptWithTools };

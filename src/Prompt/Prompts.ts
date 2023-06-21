import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";

type Tool = {
  name: string;
  description: string;
  parameters: {
    [parameterName: string]: string; //paramter_name: type as string
  };
  run: (...args: string[]) => string;
};

class PromptWithTools implements PromptTemplate {
  public modelDescription: string;
  public conversationMemory: ConversationMemory | null;

  //Context
  private tools: Tool[];
  private toolsDesription: string;
  private reActModelDescription: string;
  private modelScratchpad: string;

  constructor(
    tools: Tool[],
    conversationMemory: ConversationMemory | null = null
  ) {
    this.modelDescription =
      "You are a helpful assistant. You should try your best to answer the question. Unfortunately, you are very bad at math and don't know anything about the library and people's age so you have to always rely on the tool or the given context for every math-related, library-related, and age-related question.";

    this.conversationMemory = conversationMemory;

    this.tools = tools;
    this.toolsDesription = this.constructToolsDescription(
      this.tools
    );

    this.reActModelDescription = this.constructReActModelDescription(
      tools
    );
    this.modelScratchpad = "";
  }

  private constructReActModelDescription(
    tools: Tool[]
  ): string {
    const reActModelDescription: string = `Populate the scratchpad (delimited by the triple quote) to guide yourself toward the answer. For the scratchpad, always choose to follow only one of the situations listed below (inside the triple curly braces) and then end your answer. You CAN NOT populate the Observation field yourself\n\
    {{{\
      Situation 1: When you decide you need to use a tool (based on the observations and input question), please follow this format to answer the question:\n\
      - Thought: you should always think about what to do.\n\
      - Action: the action to take, should always be one of [${tools.map(
        (toolDocumentation) => toolDocumentation.name
      )}].\n\
      - Action Input: the input to the action. Should list the input parameter as this format suggest: "parameter1", "parameter", ...]\n\
      End Answer\n\n\

      Situation 2: When you don't need to use a tool, please follow this format to answer the question: \n\
      - Thought: you should always think about what to do.\n\
      - Final Answer: Provide your final answer for the input question from the input question or the Observation (if it exists).\n\
      End Answer\n\
    }}}\n`;
    return reActModelDescription;
  }
  private constructToolsDescription(
    tools: Tool[]
  ) {
    const toolsDescription = tools.reduce(
      (
        previousToolsDescription: string,
        currentToolDescription: Tool
      ) => {
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
      "\nYou have access to these tools (delimited by triple backticks) to assist you:\n"
    );

    return toolsDescription;
  }

  public updateConversationMemory(
    newConversationMemory: ConversationMemory | null
  ): void {
    this.conversationMemory = newConversationMemory;
  }

  public updateScratchpad(inputScratch: string): void {
    this.modelScratchpad += inputScratch;
  }

  getPrompt(): string {
    const wholePrompt: string =
      this.modelDescription +
      this.toolsDesription +
      this.reActModelDescription +
      `\nThis is the conversation so far (delimited by the triple dashes):\n---\n${this.conversationMemory?.getConversationAsString()}\n---\n` +
      `This is your scratchpad:\n"""\n${this.modelScratchpad}\n"""\n`
    return wholePrompt;
  }
}

export { PromptWithTools, Tool };

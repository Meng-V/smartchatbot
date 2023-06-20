import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "./PromptTemplate";

type ToolDocumentation = {
  name: string;
  description: string;
  parameters: {
    [parameterName: string]: string; //paramter_name: type as string
  };

  returnType: string; //type as string
};

class PromptWithTools implements PromptTemplate {
  public modelDescription: string;
  public conversationMemory: ConversationMemory | null;

  //Context
  private toolDocumentationList: ToolDocumentation[];
  private toolsDesription: string;
  private reActModelDescription: string;

  constructor(
    modelDescription: string,
    toolDocumentationList: ToolDocumentation[],
    conversationMemory: ConversationMemory | null = null
  ) {
    this.modelDescription = modelDescription;

    this.conversationMemory = conversationMemory

    this.toolDocumentationList = toolDocumentationList;
    this.toolsDesription = this.constructToolsDescription(
      this.toolDocumentationList
    );

    this.reActModelDescription = this.constructReActModelDescription(
      toolDocumentationList
    );
  }

  private constructReActModelDescription(
    toolDocumentationList: ToolDocumentation[]
  ): string {
    const reActModelDescription: string = `Use the following format: \n\
        Question: the input question you must answer. Do not complete the question yourself!\n\
        Thought: you should always think about what to do.\n\
        Action: the action to take, always should be one of [${toolDocumentationList.map(
          (toolDocumentation) => toolDocumentation.name
        )}].\n
        Action Input: the input to the action\n\
        Observation: the result of the action\n\
        ... (this Thought/Action/Action Input/Observation can repeat N times until you decide you have sufficient information to answer the original input question)\n\
        Thought: I now know the final answer\n\
        Final Answer: the final answer to the original input question.\n`;
    return reActModelDescription;
  }
  private constructToolsDescription(
    toolDocumentationList: ToolDocumentation[]
  ) {
    const toolsDescription = toolDocumentationList.reduce(
      (
        previousToolsDescription: string,
        currentToolDescription: ToolDocumentation
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
      "\nTry your best to answer the input question. You have access to these tools: \n"
    );

    return toolsDescription;
  }

  public updateConversationMemory(newConversationMemory: ConversationMemory | null): void {
    this.conversationMemory = newConversationMemory;
  }

  getPrompt(): string {
    const wholePrompt: string =
      this.modelDescription +
      this.toolsDesription +
      this.reActModelDescription +
      `\nThis is the conversation so far:\n${this.conversationMemory?.getConversationAsString()}\n`;

    return wholePrompt;
  }
}

class PromptAnalyzeInformation implements PromptTemplate {
  public modelDescription: string;
  public conversationMemory: ConversationMemory | null;

  private analyzingInstruction: string;
  private context: string;

  constructor(
    modelDescription: string,
    conversationMemory: ConversationMemory | null = null
  ) {
    this.modelDescription = modelDescription;
    this.analyzingInstruction =
      "You are trying to answer the customer's based on the context provided below\n";
    this.conversationMemory = conversationMemory;
    this.context = "";
  }

  setContext(context: string) {
    this.context = context;
  }
  public updateConversationMemory(newConversationMemory: ConversationMemory | null) {
    this.conversationMemory = newConversationMemory;
  }
  getPrompt(): string {
    const wholePrompt = this.modelDescription + "\n" + this.analyzingInstruction + this.context + "\n\nThis is the conversation so far:\n" + this.conversationMemory?.getConversationAsString();

    return wholePrompt;
  }
}

export { PromptWithTools, PromptAnalyzeInformation, ToolDocumentation };

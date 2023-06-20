import { OpenAIModel } from "../LLM/OpenAIAgent";
import { ConversationMemory } from "../Memory/ConversationMemory";
import {
  PromptAnalyzeInformation,
  PromptWithTools,
  ToolDocumentation,
} from "../Prompt/Prompts";
import { IAgent, ToolFunction } from "./IAgent";

type AgentOutput = {
  outputType: "final",
  finalAnswer: string,
} | {
  outputType: "action",
  action: string,
  actionInput: string[],
}

class Agent implements IAgent{
  llmModel: OpenAIModel;
  basePrompt: PromptWithTools;
  promptAnalyzeInformation: PromptAnalyzeInformation | null;
  memory: ConversationMemory | null;

  toolListMap: Map<string, ToolFunction>;

  constructor(
    modelDescription: string,
    llmModel: OpenAIModel,
    toolLlist: ToolFunction[],
    toolDocumentationList: ToolDocumentation[],
    memory: ConversationMemory
  ) {
    this.llmModel = llmModel;
    this.memory = memory;
    this.basePrompt = new PromptWithTools(
      modelDescription,
      toolDocumentationList,
      this.memory
    );
    this.promptAnalyzeInformation = new PromptAnalyzeInformation(
      modelDescription,
      this.memory
    );
    this.toolListMap = new Map<string, ToolFunction>;
    toolLlist.forEach((tool) => {
      this.toolListMap.set(tool.name, tool);
    })
  }

  async agentRun(userInput: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      this.memory?.addToConversation("Customer", userInput);
      this.basePrompt.updateConversationMemory(this.memory);
      const initialResponse: string = await this.llmModel.getModelResponse(userInput, this.basePrompt);
      const outputParsed = this.parseLLMOutput(initialResponse);
      if (outputParsed.outputType === 'action') {

      } else if (outputParsed.outputType === 'final') {

      } else {
        throw new Error("Failed to parse LLMOutput");
      }

    })
  }

  private accessToolList(toolName: string, toolInput: string[]): string {
    if (this.toolListMap.has(toolName)) {
      const tool = this.toolListMap.get(toolName);

      return tool!.func(...toolInput);
    }
    else {
      throw new Error("Tool does not exist")
    }
  }

  parseLLMOutput(llmOutput: string): AgentOutput {
    const actionRegex: RegExp = /(.*)Action: (.+?)\nAction Input: (.+?)\nEnd Answer$/;
    const finalAnswerRegex: RegExp = /(.*)Final Answer: (.+?)\nEnd Answer$/;

    const actionMatch = llmOutput.match(actionRegex);
    const finalAnswerMatch = llmOutput.match(finalAnswerRegex)

    if (actionMatch) {
      return {
        outputType: "action",
        action: actionMatch[1],
        actionInput: actionMatch[2].split(','),
      }
    }

    else if (finalAnswerMatch) {
      return {
        outputType: "final",
        finalAnswer: finalAnswerMatch[1],
      }
    }
    else {
      throw new Error("Cannot parse LLM Output");
    }
  }
}

export {Agent};
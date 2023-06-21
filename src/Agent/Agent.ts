import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationMemory } from "../Memory/ConversationMemory";
import {
  PromptWithTools,
} from "../Prompt/Prompts";

import { Tool } from "../ToolBox/ToolTemplates";
import { IAgent } from "./IAgent";

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
  memory: ConversationMemory | null;

  toolListMap: Map<string, Tool>;

  constructor(
    llmModel: OpenAIModel,
    tools: Tool[],
    memory: ConversationMemory
  ) {
    this.llmModel = llmModel;
    this.memory = memory;
    this.basePrompt = new PromptWithTools(
      tools,
      this.memory
    );
    this.toolListMap = new Map<string, Tool>;
    tools.forEach((tool) => {
      this.toolListMap.set(tool.name, tool);
    })
  }

  async agentRun(userInput: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(`Request Time Out. Prompt so far: ${this.basePrompt.getPrompt()}`);
      }, 5000);

      this.memory?.addToConversation("Customer", userInput);
      this.basePrompt.updateConversationMemory(this.memory);
      let llmResponse: string = await this.llmModel.getModelResponse(this.basePrompt);
      let outputParsed = this.parseLLMOutput(llmResponse);
      while (outputParsed.outputType !== 'final') {
        const toolResponse = this.accessToolList(outputParsed.action, outputParsed.actionInput)
        this.basePrompt.updateScratchpad(`Observation: Tool returns ${toolResponse}`);

        llmResponse = await this.llmModel.getModelResponse(this.basePrompt)
        outputParsed = this.parseLLMOutput(llmResponse);
      }
      resolve(outputParsed.finalAnswer);

    })
  }

  private accessToolList(toolName: string, toolInput: string[]): string {
    if (this.toolListMap.has(toolName)) {
      const tool = this.toolListMap.get(toolName);

      return tool!.run(...toolInput);
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
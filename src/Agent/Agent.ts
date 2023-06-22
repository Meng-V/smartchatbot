import { rejects } from "assert";
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

  toolsMap: Map<string, Tool>;

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
    this.toolsMap = new Map<string, Tool>;
    tools.forEach((tool) => {
      this.toolsMap.set(tool.name, tool);
    })
  }

  async agentRun(userInput: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject(`Request Time Out. Prompt so far: ${this.basePrompt.getPrompt()}`);
      // }, 5000);

      this.memory?.addToConversation("Customer", userInput);
      this.basePrompt.updateConversationMemory(this.memory);
      let llmResponse: string = await this.llmModel.getModelResponse(this.basePrompt);
      console.log(llmResponse)
      let outputParsed = this.parseLLMOutput(llmResponse);
      while (outputParsed.outputType !== 'final') {
        const toolResponse = await this.accessToolBox(outputParsed.action, outputParsed.actionInput)
        this.basePrompt.updateScratchpad(`Observation: Tool returns ${toolResponse}`);

        llmResponse = await this.llmModel.getModelResponse(this.basePrompt)
        outputParsed = this.parseLLMOutput(llmResponse);
      }
      resolve(outputParsed.finalAnswer);

    })
  }

  private async accessToolBox(toolName: string, toolInput: string[]): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
//        reject("Request Time Out");
//      }, 5000);
      
      if (this.toolsMap.has(toolName)) {
        const tool = this.toolsMap.get(toolName);

        resolve(await tool!.run(...toolInput));
      }
      else {
        throw new Error("Tool does not exist");
        reject("Tool does not exist")
      }
    })
  }

  parseLLMOutput(llmOutput: string): AgentOutput {
    const actionRegex: RegExp = /Action: ([\s\S]*)\nAction Input: ([\s\S]*)$/;
    const finalAnswerRegex: RegExp = /Final Answer: ([\s\S]*)$/;

    const actionMatch = llmOutput.match(actionRegex);
    const finalAnswerMatch = llmOutput.match(finalAnswerRegex)

    console.log("action: ", actionMatch)
    console.log("finalAnswer: ", finalAnswerMatch)

    function trim(text: string) {
      //Trim leading space and new line character
      return text.replace(/^\s+|\s+$/g, '').replace(/"/g, '');
    }

    if (finalAnswerMatch) {
      return {
        outputType: "final",
        finalAnswer: trim(finalAnswerMatch[1]),
      }
    }
    else if (actionMatch) {
      return {
        outputType: "action",
        action: trim(actionMatch[1]),
        actionInput: actionMatch[2].split(',').map((item) => trim(item)),
      }
    }
    else {
      throw new Error("Cannot parse LLM Output");
    }
  }
}

export {Agent};
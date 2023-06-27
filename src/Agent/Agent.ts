import { rejects } from "assert";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationMemory } from "../Memory/ConversationMemory";
import {
  PromptWithTools,
} from "../Prompt/Prompts";

import { Tool } from "../ToolBox/ToolTemplates";

interface IAgent {
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolsMap: Map<string, Tool>;

  agentRun(userInput: string): Promise<string>;
}

type AgentOutput = {
  outputType: "final",
  finalAnswer: string,
} | {
  outputType: "action",
  action: string,
  actionInput: {[key: string] : string},
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
      this.basePrompt.emptyScratchpad();
      let llmResponse: string = await this.llmModel.getModelResponse(this.basePrompt);
      // console.log(llmResponse)
      let outputParsed = this.parseLLMOutput(llmResponse);
      while (outputParsed.outputType !== 'final') {
        this.basePrompt.updateScratchpad(`Action: ${outputParsed.action}`)
        this.basePrompt.updateScratchpad(`Action Input: ${outputParsed.actionInput}`)
        const toolResponse = await this.accessToolBox(outputParsed.action, outputParsed.actionInput)
        this.basePrompt.updateScratchpad(`Observation: ${toolResponse}`);

        llmResponse = await this.llmModel.getModelResponse(this.basePrompt)
        // console.log(llmResponse);
        outputParsed = this.parseLLMOutput(llmResponse);
      }
      this.memory?.addToConversation("AIAgent", outputParsed.finalAnswer);
      this.basePrompt.updateConversationMemory(this.memory);
      console.log(this.basePrompt.getPrompt())
      resolve(outputParsed.finalAnswer);

    })
  }

  private async accessToolBox(toolName: string, toolInput: {[key: string]: string}): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
//        reject("Request Time Out");
//      }, 5000);
      
      if (this.toolsMap.has(toolName)) {
        const tool = this.toolsMap.get(toolName);

        resolve(await tool!.run(toolInput));
      }
      else {
        throw new Error("Tool does not exist");
        reject("Tool does not exist")
      }
    })
  }

  parseLLMOutput(llmOutput: string): AgentOutput {
    const jsonString = llmOutput.replace(/'/g, '') // Remove single quotes
    .replace(/\+/g, '') // Remove "+" signs
    .replace(/\n\s*/g, '') // Remove newlines and spaces
    .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"').toString(); // Keep double quotes for property names and values
    const outputObj = JSON.parse(jsonString);

    function trim(text: string) {
      //Trim leading space and new line character
      return text.replace(/^\s+|\s+$/g, '').replace(/"/g, '').replace(/\n/g, '');
    }

    if (outputObj["Final Answer"] && outputObj["Final Answer"] !== "null") {
      return {
        outputType: "final",
        finalAnswer: trim(outputObj["Final Answer"]),
      }
    }
    else if (outputObj["Action"] && outputObj["Action Input"] && outputObj["Action"] !== "null" && outputObj["Action Input"] !== "null") {
      return {
        outputType: "action",
        action: trim(outputObj["Action"]),
        actionInput: outputObj["Action Input"],
      }
    }
    else {
      throw new Error("Cannot parse LLM Output");
    }
  }
}

export {Agent};
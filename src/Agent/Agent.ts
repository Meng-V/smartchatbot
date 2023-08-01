import prisma from "../../prisma/prisma";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationMemory } from "../Memory/ConversationMemory";
import { ModelPromptWithTools } from "../Prompt/Prompts";

import { Tool } from "../ToolBox/ToolTemplates";

type TokenUsage = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

type AgentResponse = {
  actions: string[];
  response: string[];
  tokenUsage: TokenUsage;
};

interface IAgent {
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolsMap: Map<string, Tool>;

  agentRun(userInput: string): Promise<AgentResponse>;
}

type AgentOutput =
  | {
      outputType: "final";
      thought: string;
      finalAnswer: string;
    }
  | {
      outputType: "action";
      thought: string;
      action: string;
      actionInput: { [key: string]: string };
    }
  | {
      outputType: undefined;
    };

class Agent implements IAgent {
  llmModel: OpenAIModel;
  basePrompt: ModelPromptWithTools;
  memory: ConversationMemory | null;

  toolsMap: Map<string, Tool>;
  LLMCallLimit: number = 5;

  actions: Set<string> = new Set();

  constructor(
    llmModel: OpenAIModel,
    tools: Tool[],
    memory: ConversationMemory,
  ) {
    this.llmModel = llmModel;
    this.memory = memory;
    this.basePrompt = new ModelPromptWithTools(tools, this.memory);
    this.toolsMap = new Map<string, Tool>();
    tools.forEach((tool) => {
      this.toolsMap.set(tool.name, tool);
    });
  }
  /**
   * This function takes in message from user to feed to the LLM Agent. Return the message from the Agent
   * @param userInput
   * @returns message from the LLM Agent
   */

  async agentRun(userInput: string): Promise<AgentResponse> {
    return new Promise<AgentResponse>(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject(`Request Time Out. Prompt so far: ${this.basePrompt.getPrompt()}`);
      // }, 5000);
      let completionTokens: number = 0;
      let promptTokens: number = 0;
      let totalTokens: number = 0;

      this.memory?.addToConversation("Customer", userInput);
      this.basePrompt.updateConversationMemory(this.memory);
      this.basePrompt.emptyScratchpad();
      let llmResponseObj = await this.llmModel.getModelResponse(
        this.basePrompt,
      );
      let llmResponse = llmResponseObj.response;
      //Update tokens usage
      totalTokens += llmResponseObj.usage.totalTokens;
      promptTokens += llmResponseObj.usage.promptTokens;
      completionTokens += llmResponseObj.usage.completionTokens;

      // console.log(llmResponse)
      let outputParsed = this.parseLLMOutput(llmResponse);
      let llmCallNum = 1;

      //Handle cases when model doesn't output either actions and final answer
      while (outputParsed.outputType !== "final") {
        if (llmCallNum > this.LLMCallLimit) {
          reject("Too many LMM Call. Possible inifinity loop");
          return;
        }
        if (outputParsed.outputType === "action") {
          this.basePrompt.updateScratchpad(
            `Thought: ${outputParsed.thought}\n`,
          );
          this.basePrompt.updateScratchpad(`Action: ${outputParsed.action}\n`);
          this.basePrompt.updateScratchpad(
            `Action Input: ${JSON.stringify(outputParsed.actionInput)}\n`,
          );
          const toolResponse = await this.accessToolBox(
            outputParsed.action,
            outputParsed.actionInput,
          );

          this.basePrompt.updateScratchpad(`Observation: ${toolResponse}`);
        }
        llmResponseObj = await this.llmModel.getModelResponse(this.basePrompt);
        llmResponse = llmResponseObj.response;

        //Update tokens usage
        totalTokens += llmResponseObj.usage.totalTokens;
        promptTokens += llmResponseObj.usage.promptTokens;
        completionTokens += llmResponseObj.usage.completionTokens;

        outputParsed = this.parseLLMOutput(llmResponse);
        llmCallNum++;
      }

      //What if outputParsed.outputType == undefined
      this.memory?.addToConversation("AIAgent", outputParsed.finalAnswer);
      this.basePrompt.updateConversationMemory(this.memory);

      resolve({
        actions: [...this.actions],
        response: outputParsed.finalAnswer.split("\n"),
        tokenUsage: { totalTokens, promptTokens, completionTokens },
      });
    });
  }

  private async accessToolBox(
    toolName: string,
    toolInput: { [key: string]: string },
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
      //        reject("Request Time Out");
      //      }, 5000);

      if (this.toolsMap.has(toolName)) {
        const tool = this.toolsMap.get(toolName);

        resolve(await tool!.toolRun(toolInput));
      } else {
        throw new Error("Tool does not exist");
        reject("Tool does not exist");
      }
    });
  }

  parseLLMOutput(llmOutput: string): AgentOutput {
    const jsonString = llmOutput
      .replace(/'/g, "") // Remove single quotes
      .replace(/\+/g, "") // Remove "+" signs
      .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"')
      .toString(); // Keep double quotes for property names and values
    const outputObj = JSON.parse(jsonString);

    function trim(text: string) {
      //Trim leading space and new line character
      return text.replace(/^\s+|\s+$/g, "");
    }

    if (outputObj["Final Answer"] && outputObj["Final Answer"] !== "null") {
      return {
        outputType: "final",
        thought: trim(outputObj["Thought"]),
        finalAnswer: trim(outputObj["Final Answer"]),
      };
    } else if (
      outputObj["Action"] &&
      outputObj["Action Input"] &&
      outputObj["Action"] !== "null" &&
      outputObj["Action Input"] !== "null"
    ) {
      this.actions.add(trim(outputObj["Action"]));
      return {
        outputType: "action",
        thought: trim(outputObj["Thought"]),
        action: trim(outputObj["Action"]),
        actionInput: outputObj["Action Input"],
      };
    } else {
      return {
        outputType: undefined,
      };
    }
  }
}

export { Agent, TokenUsage };

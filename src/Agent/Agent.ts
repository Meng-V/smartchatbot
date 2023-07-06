import { rejects } from "assert";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptWithTools } from "../Prompt/Prompts";

import { Tool } from "../ToolBox/ToolTemplates";
import {createObjectCsvWriter} from 'csv-writer';
import cacheService from "../Service/cacheService";

type AgentResponse = {
  action: string | null,
  response: string[],
}

const csvWriter = createObjectCsvWriter({
  path: 'log.csv',
  header: [
    {id: 'cookie', title:'COOKIES'},
    {id: 'timestamp', title: 'TIMESTAMP'},
    {id: 'tokensUsed', title: 'TOKENS_USED'},
    // any other fields
  ],
  append: true
});

interface IAgent {
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolsMap: Map<string, Tool>;
  
  agentRun(userInput: string, cookie: string): Promise<AgentResponse>;
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
    };

class Agent implements IAgent {
  llmModel: OpenAIModel;
  basePrompt: PromptWithTools;
  memory: ConversationMemory | null;

  toolsMap: Map<string, Tool>;
  LLMCallLimit: number = 5;
  totalTokensUsed: number = 0;

  mostRecentAction: string | null = null;

  constructor(
    llmModel: OpenAIModel,
    tools: Tool[],
    memory: ConversationMemory
  ) {
    this.llmModel = llmModel;
    this.memory = memory;
    this.basePrompt = new PromptWithTools(tools, this.memory);
    this.toolsMap = new Map<string, Tool>();
    tools.forEach((tool) => {
      this.toolsMap.set(tool.name, tool);
    });
  }


  async agentRun(userInput: string, cookie: string): Promise<AgentResponse> {
    return new Promise<AgentResponse>(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject(`Request Time Out. Prompt so far: ${this.basePrompt.getPrompt()}`);
      // }, 5000);

      this.memory?.addToConversation("Customer", userInput);
      this.basePrompt.updateConversationMemory(this.memory);
      this.basePrompt.emptyScratchpad();
      let llmResponseObj = await this.llmModel.getModelResponseWithCache(this.basePrompt);
      let llmResponse = llmResponseObj.response;
      this.totalTokensUsed += llmResponseObj.usage.total_tokens; // update the total tokens used
      
      // console.log(llmResponse)
      let outputParsed = this.parseLLMOutput(llmResponse);
      let llmCallNum = 1;
      while (outputParsed.outputType !== "final") {
        if (llmCallNum > this.LLMCallLimit)
          reject("Too many LMM Call. Possible inifinity loop");

        this.basePrompt.updateScratchpad(`Thought: ${outputParsed.thought}\n`);
        this.basePrompt.updateScratchpad(`Action: ${outputParsed.action}\n`);
        this.basePrompt.updateScratchpad(
          `Action Input: ${JSON.stringify(outputParsed.actionInput)}\n`
        );
        // console.log(this.basePrompt.getScratchpad());
        const toolResponse = await this.accessToolBox(
          outputParsed.action,
          outputParsed.actionInput
        );

        this.basePrompt.updateScratchpad(`Observation: ${toolResponse}`);
        console.log(this.basePrompt.getScratchpad());

        llmResponseObj = await this.llmModel.getModelResponseWithCache(this.basePrompt);
        llmResponse = llmResponseObj.response;
        this.totalTokensUsed += llmResponseObj.usage.total_tokens; // update the total tokens used

        outputParsed = this.parseLLMOutput(llmResponse);
        llmCallNum++;
      }
      this.memory?.addToConversation("AIAgent", outputParsed.finalAnswer);
      this.basePrompt.updateConversationMemory(this.memory);

      //loggin file
      const record = {
        cookie: cookie,
        timestamp: new Date().toISOString(),
        tokensUsed: this.totalTokensUsed,
        // any other fields
      };
      csvWriter.writeRecords([record]);       // returns a promise
        // .then(() => console.log('Data logged successfully.'));

      this.totalTokensUsed = 0;
      resolve(
        {
          action: this.mostRecentAction,
          response: outputParsed.finalAnswer.split('\n'),
        }
      );
    });
  }

  private async accessToolBox(
    toolName: string,
    toolInput: { [key: string]: string }
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
      //        reject("Request Time Out");
      //      }, 5000);

      if (this.toolsMap.has(toolName)) {
        const tool = this.toolsMap.get(toolName);

        resolve(await tool!.run(toolInput));
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
      return text
        .replace(/^\s+|\s+$/g, "")
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
      this.mostRecentAction = trim(outputObj["Action"])
      return {
        outputType: "action",
        thought: trim(outputObj["Thought"]),
        action: this.mostRecentAction,
        actionInput: outputObj["Action Input"],
      };
    } else {
      console.log(outputObj)
      throw new Error("Cannot parse LLM Output");
    }
  }
}

export { Agent };

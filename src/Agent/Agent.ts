import { ConversationMemory } from "../Memory/ConversationMemory";
import { ModelPromptWithTools } from "../Prompt/Prompts";
import { OpenAIModel } from "../LLM/LLMModels";
import { Tool } from "../ToolBox/ToolTemplates";
import { IAgent, AgentResponse, AgentOutput } from "./IAgent";

/**
 * Agent would allow the llmModel (GPT3.5 or GPT4) to use the tools as the user request. Conversation memory would be inside memory 
 */
class Agent implements IAgent {
  name: string;
  llmModel: OpenAIModel;
  basePrompt: ModelPromptWithTools;
  memory: ConversationMemory | null;

  toolsMap: Map<string, Tool>;
  LLMCallLimit: number = 5;

  actions: Set<string> = new Set();

  /**
   * Construct Agent object.
   * @param name agent name
   * @param llmModel llmModel to control the action of the agent
   * @param tools array of the tools the Agent can use
   * @param memory Conversation Memory to keep track of the current conversation context
   * @param toolsAreReadyToUse if true, the agent can use the input tools. if false, the agent can only provide the tools information.
   */
  constructor(
    name: string,
    llmModel: OpenAIModel,
    tools: Tool[],
    memory: ConversationMemory,
    toolsAreReadyToUse: boolean = true,
  ) {
    this.name = name;
    this.llmModel = llmModel;
    this.memory = memory;

    //base prompt would instruct the LLM how to use the tools and give the LLM the context of the conversation
    this.basePrompt = new ModelPromptWithTools(tools, this.memory, toolsAreReadyToUse);
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
      try {
        let completionTokens: number = 0;
        let promptTokens: number = 0;
        let totalTokens: number = 0;

        // Empty the scratchpad for a new conversation
        this.basePrompt.emptyScratchpad();
        // Get the response from the LLM OpenAIModel
        let llmResponseObj = await this.llmModel.getModelResponse(
          this.basePrompt,
        );
        let llmResponse = llmResponseObj.response;
        //Update tokens usage
        totalTokens += llmResponseObj.usage.totalTokens;
        promptTokens += llmResponseObj.usage.promptTokens;
        completionTokens += llmResponseObj.usage.completionTokens;

        console.log("Here is the LLM response:", llmResponse);
        let outputParsed = this.parseLLMOutput(llmResponse);
        let llmCallNum = 1;

        // Handle cases when model doesn't output either actions and final answer
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
            console.log(toolResponse)

            this.basePrompt.updateScratchpad(`Tool Response: ${toolResponse}`);
          }
          llmResponseObj = await this.llmModel.getModelResponse(this.basePrompt);
          llmResponse = llmResponseObj.response;
          console.log(llmResponse)

          //Update tokens usage
          totalTokens += llmResponseObj.usage.totalTokens;
          promptTokens += llmResponseObj.usage.promptTokens;
          completionTokens += llmResponseObj.usage.completionTokens;

          outputParsed = this.parseLLMOutput(llmResponse);
          llmCallNum++;
        }

        resolve({
          actions: [...this.actions],
          response: outputParsed.finalAnswer.split("\n"),
          tokenUsage: { totalTokens, promptTokens, completionTokens },
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * This function help the agent call the available tools with the appropriate parameters
   * @param toolName name of the tool you would use
   * @param toolInput { [paramName: string]: string } parameter and their value
   * @returns the returned string from the tool
   */
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

        let toolRespose;
        try {
          toolRespose = await tool!.toolRun(toolInput);
        } catch (error) {
          reject(error);
          return;
        }
        resolve(toolRespose);
      } else {
        reject("Tool does not exist");
      }
    });
  }

  /**
   * This function parse the LLM output in the format:
   * {Action: "", Action Input: "", Final Answer: ""}
   * @param llmOutput the string output from the LLM
   * @returns AgentOutput
   */
  parseLLMOutput(llmOutput: string): AgentOutput {
    const jsonString = llmOutput
      .replace(/'/g, "") // Remove single quotes
      .replace(/\+/g, "") // Remove "+" signs
      .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"')
      .replace(/\n/g, '');
    console.log(jsonString);
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

export { Agent };

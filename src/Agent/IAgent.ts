import { ConversationMemory } from "../Memory/ConversationMemory";
import { OpenAIModel } from "../LLM/LLMModels";
import { Tool } from "../ToolBox/ToolTemplates";

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
  name: string;
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolsMap: Map<string, Tool>;

  agentRun(userInput: string): Promise<AgentResponse>;
}

export { IAgent, AgentOutput, AgentResponse, TokenUsage };

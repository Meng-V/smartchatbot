import { ConversationMemory } from "../Memory/ConversationMemory";
import { OpenAIModel } from "../LLM/LLMModels";
import { Tool } from "../ToolBox/ToolTemplates";

/**
 * A union type that can represent one of three different shapes of objects
 */
type AgentOutput =
    // The final answer from the agent to the user's question input
  | {
      outputType: "final";
      thought: string;
      finalAnswer: string;
    }
    // The agent's response to the user's action request input
  | {
      outputType: "action";
      thought: string;
      action: string;
      actionInput: { [key: string]: string };
    }
    // If something unclear...
  | {
      outputType: undefined;
    };

/**
 * Tracks the usage of tokens in the agent's response
 */
type TokenUsage = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

/**
 * The agent's response to the user's input
 */
type AgentResponse = {
  actions: string[];
  response: string[];
  tokenUsage: TokenUsage;
};

/**
 * Interface for Agent
 */
interface IAgent {
  name: string;
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolsMap: Map<string, Tool>;
  // An abstract function that takes in user input and async return the AIAgent answer
  agentRun(userInput: string): Promise<AgentResponse>;
}

export { IAgent, AgentOutput, AgentResponse, TokenUsage };

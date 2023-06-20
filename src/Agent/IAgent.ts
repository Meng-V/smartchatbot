import { OpenAIModel } from "../LLM/OpenAIAgent";
import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { PromptWithTools } from "../Prompt/Prompts";
type ToolFunction = { name: string; func: (...args: string[]) => string; };

interface IAgent {
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolListMap: Map<string, ToolFunction>;

  agentRun(userInput: string): Promise<string>;
}

export { IAgent, ToolFunction };

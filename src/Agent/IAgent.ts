import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationMemory } from "../Memory/ConversationMemory";
import { PromptTemplate } from "../Prompt/PromptTemplate";
import { PromptWithTools } from "../Prompt/Prompts";
import { Tool } from "../ToolBox/ToolTemplates";

interface IAgent {
  llmModel: OpenAIModel;
  memory: ConversationMemory | null;
  toolListMap: Map<string, Tool>;

  agentRun(userInput: string): Promise<string>;
}

export { IAgent };

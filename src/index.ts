import { stringify } from "querystring";
import { OpenAIModel } from "./LLM/LLMModels";
import { ConversationMemory } from "./Memory/ConversationMemory";
import { PromptWithTools, Tool } from "./Prompt/Prompts";

function defineTools(): Tool[] {
  const siteSearch = Tool
}
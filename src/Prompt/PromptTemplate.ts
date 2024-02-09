import { TokenUsage } from "../Agent/IAgent";
import { ConversationMemory } from "../Memory/ConversationMemory";

/**
 * Interface for Prompt object
 * Prompt object would be used to generate the prompt for the LLM
 */
interface PromptTemplate {
    modelDescription: string;   // Description of the model
    getSystemDescription(): string;   // Description of the system
    getPrompt(): Promise<{prompt: string} | { prompt: string; tokenUsage: TokenUsage }>;    // Get the prompt
}

export { PromptTemplate };

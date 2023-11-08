import { TokenUsage } from "../Agent/IAgent";
import { ConversationMemory } from "../Memory/ConversationMemory";

/**
 * Interface for Prompt object
 */
interface PromptTemplate {
    modelDescription: string;
    getSystemDescription(): string;
    getPrompt(): Promise<{prompt: string} | { prompt: string; tokenUsage: TokenUsage }>;
}

export { PromptTemplate };

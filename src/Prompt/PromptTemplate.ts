import { TokenUsage } from "../Agent/Agent";
import { ConversationMemory } from "../Memory/ConversationMemory";

interface PromptTemplate {
    modelDescription: string;
    getSystemDescription(): string;
    getPrompt(): Promise<{prompt: string} | { prompt: string; tokenUsage: TokenUsage }>;
}

export {PromptTemplate};
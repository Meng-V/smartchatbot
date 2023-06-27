import { ConversationMemory } from "../Memory/ConversationMemory";

interface PromptTemplate {
    modelDescription: string;
    conversationMemory: ConversationMemory | null;
    emptyScratchpad(): void;
    updateScratchpad(inputScratch: string): void;
    updateConversationMemory(newConversationMemory: ConversationMemory | null): void;
    getSystemDescription(): string;
    getPrompt(): string;
}

export {PromptTemplate};
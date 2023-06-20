import { ConversationMemory } from "../Memory/ConversationMemory";

interface PromptTemplate {
    modelDescription: string;
    conversationMemory: ConversationMemory | null;
    updateConversationMemory(newConversationMemory: ConversationMemory | null): void;
    getPrompt(): string;
}

export {PromptTemplate};
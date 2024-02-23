import { Module } from '@nestjs/common';
import { ChatbotConversationPromptWithToolsService } from './chatbot-conversation-prompt-with-tools/chatbot-conversation-prompt-with-tools.service';

@Module({
  providers: [ChatbotConversationPromptWithToolsService]
})
export class PromptModule {}

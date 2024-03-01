import { Module } from '@nestjs/common';
import { ChatbotConversationPromptWithToolsService } from './chatbot-conversation-prompt-with-tools/chatbot-conversation-prompt-with-tools.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [ChatbotConversationPromptWithToolsService, ConfigService],
})
export class PromptModule {}

import { Module } from '@nestjs/common';
import { ChatbotConversationPromptWithToolsService } from './chatbot-conversation-prompt-with-tools/chatbot-conversation-prompt-with-tools.service';
import { ConversationSummarizationPromptService } from './conversation-summarization-prompt/conversation-summarization-prompt.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [
    ConversationSummarizationPromptService,
    ChatbotConversationPromptWithToolsService,
  ],
  exports: [
    ConversationSummarizationPromptService,
    ChatbotConversationPromptWithToolsService,
  ],
})
export class PromptModule {}

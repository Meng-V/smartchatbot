import { Injectable, Scope } from '@nestjs/common';

/**
 * This service is for getting prompt for sending to LLM model. This prompt is aware of conversation history, context, and which tools are available to use.
 * 
 * Scope: Request
 */
@Injectable({ scope: Scope.REQUEST })
export class ChatbotConversationPromptWithToolsService {    
  
}

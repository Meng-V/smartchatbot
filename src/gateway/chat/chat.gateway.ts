import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { LlmConnectionGateway } from '../connection/llm-connection.gateway';
import { LlmChainService } from 'src/llm-chain/llm-chain.service';
import { Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Role } from '../../llm-chain/memory/memory.interface';
import { TokenUsage } from '../../shared/services/token-usage/token-usage.service';
import { LlmModelType } from '../../llm-chain/llm/llm.module';
import { ErrorMonitoringService } from '../../shared/services/error-monitoring/error-monitoring.service';
import { PerformanceMonitoringService } from '../../shared/services/performance-monitoring/performance-monitoring.service';
import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

export type UserFeedback = {
  userRating: number;
  userComment?: string;
};

type ConversationData = {
  conversationId: string;
  userFeedback?: UserFeedback;
};

@WebSocketGateway({
  path: '/smartchatbot/socket.io',
  cors: {
    origin: ['https://new.lib.miamioh.edu'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  private clientIdToConversationDataMapping: Map<string, ConversationData> =
    new Map<string, ConversationData>();

  constructor(
    private llmConnnectionGateway: LlmConnectionGateway,
    private databaseService: DatabaseService,
    private errorMonitoringService: ErrorMonitoringService,
    private performanceMonitoringService: PerformanceMonitoringService,
  ) {}

  @SubscribeMessage('message')
  async handleUserMessage(
    @MessageBody() userMessage: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Start performance monitoring
    const endTimer = this.performanceMonitoringService.startTimer(
      'chat-message-handling',
      {
        clientId: client.id,
        messageLength: userMessage?.length || 0,
      },
    );

    let conversationId: string | undefined;
    let messageId: string | undefined;
    let success = true;

    try {
      // Input validation
      if (
        !userMessage ||
        typeof userMessage !== 'string' ||
        userMessage.trim().length === 0
      ) {
        this.errorMonitoringService.logError(
          'chat-validation',
          'Invalid message received',
          'warn',
          { clientId: client.id, messageType: typeof userMessage },
        );
        this.sendErrorResponse(client, 'Please provide a valid message.');
        success = false;
        return;
      }

      // Sanitize and limit message length
      const sanitizedMessage = userMessage.trim().substring(0, 2000);

      const conversationData = this.clientIdToConversationDataMapping.get(
        client.id,
      );

      // Start database save and LLM chain initialization in parallel
      const dbPromise = (async () => {
        try {
          const [, newConversationId] =
            await this.databaseService.addMessageToDatabase(
              Role.Customer,
              sanitizedMessage,
              conversationData?.conversationId,
            );
          conversationId = newConversationId;

          if (!this.clientIdToConversationDataMapping.has(client.id)) {
            this.clientIdToConversationDataMapping.set(client.id, {
              conversationId: newConversationId,
            });
          }
          return newConversationId;
        } catch (dbError) {
          this.logger.error(
            'Database error while saving user message:',
            dbError,
          );
          this.errorMonitoringService.logError(
            'database-error',
            'Failed to save user message to database',
            'error',
            { clientId: client.id, messageLength: sanitizedMessage.length },
            dbError instanceof Error ? dbError.stack : undefined,
          );
          throw dbError;
        }
      })();

      const llmChainPromise =
        this.llmConnnectionGateway.getLlmChainForCurrentSocket(client.id);

      // Wait for database save to complete
      try {
        await dbPromise;
      } catch (dbError) {
        this.sendErrorResponse(
          client,
          "I'm having trouble saving your message. Please try again, or contact a librarian for immediate assistance.",
        );
        success = false;
        return;
      }

      // LLM Chain operations with comprehensive error handling
      let modelResponse: string;
      try {
        const llmChain = await llmChainPromise;

        // Set timeout for LLM response - reduced to 20s
        const responsePromise = llmChain.getModelResponse(sanitizedMessage);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('LLM response timeout')), 20000); // 20 second timeout
        });

        modelResponse = await Promise.race([responsePromise, timeoutPromise]);
      } catch (llmError) {
        this.logger.error('LLM Chain error:', llmError);
        this.errorMonitoringService.logError(
          'llm-error',
          'LLM Chain failed to generate response',
          'error',
          {
            clientId: client.id,
            messageLength: sanitizedMessage.length,
            errorType:
              llmError instanceof Error ? llmError.constructor.name : 'unknown',
          },
          llmError instanceof Error ? llmError.stack : undefined,
        );

        // Provide helpful fallback response with librarian guidance
        modelResponse = this.generateFallbackResponse(
          sanitizedMessage,
          llmError,
        );
        success = false; // Mark as partial failure but still provide response
      }

      // Send response to client immediately
      const tempMessageId = 'temp-' + Date.now();
      client.emit('message', {
        messageId: tempMessageId,
        message: modelResponse,
      });

      // Save AI response to database in background
      this.databaseService
        .addMessageToDatabase(
          Role.AIAgent,
          modelResponse,
          this.clientIdToConversationDataMapping.get(client.id)?.conversationId,
        )
        .then(([modelMessageId]) => {
          messageId = modelMessageId;
        })
        .catch((dbError) => {
          this.logger.error(
            'Database error while saving AI response:',
            dbError,
          );
          this.logger.warn(
            'Response sent to user but not saved to database due to error',
          );
        });
    } catch (unexpectedError) {
      this.logger.error(
        'Unexpected error in handleUserMessage:',
        unexpectedError,
      );
      this.errorMonitoringService.logError(
        'chat-gateway',
        'Unexpected error in chat message handling',
        'error',
        {
          clientId: client.id,
          errorType:
            unexpectedError instanceof Error
              ? unexpectedError.constructor.name
              : 'unknown',
          triggerAutoRestart: true,
        },
        unexpectedError instanceof Error ? unexpectedError.stack : undefined,
      );
      this.sendErrorResponse(
        client,
        'I encountered an unexpected issue. Let me connect you with a human librarian who can help you right away.',
      );
      success = false;
    } finally {
      // Complete performance monitoring
      endTimer();
    }
  }

  private sendErrorResponse(client: Socket, userMessage: string): void {
    const errorResponse = {
      messageId: 'error-' + Date.now(),
      message: userMessage,
      isError: true,
      showLibrarianOption: true,
    };
    client.emit('message', errorResponse);
  }

  private generateFallbackResponse(userMessage: string, error: any): string {
    this.logger.warn(
      `Generating fallback response for message: "${userMessage.substring(0, 50)}..." due to error: ${error.message}`,
    );

    // Analyze user message to provide contextual fallback
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('hour') ||
      lowerMessage.includes('open') ||
      lowerMessage.includes('close')
    ) {
      return `I'm having trouble accessing current library hours right now. For the most up-to-date hours and information, please contact King Library directly at (513) 529-4141 or visit our website. You can also speak with a librarian using the "Talk to a human librarian" option below.`;
    }

    if (
      lowerMessage.includes('room') ||
      lowerMessage.includes('reserve') ||
      lowerMessage.includes('book')
    ) {
      return `I'm currently unable to process room reservations due to a system issue. You can make reservations directly at www.lib.miamioh.edu or contact the library at (513) 529-4141. For immediate assistance, please use the "Talk to a human librarian" option.`;
    }

    if (
      lowerMessage.includes('librarian') ||
      lowerMessage.includes('help') ||
      lowerMessage.includes('research')
    ) {
      return `I'm experiencing some technical difficulties right now, but I can still help you connect with the right person! Please use the "Talk to a human librarian" option below, or you can contact King Library directly at (513) 529-4141 for immediate research assistance.`;
    }

    if (
      lowerMessage.includes('search') ||
      lowerMessage.includes('find') ||
      lowerMessage.includes('database')
    ) {
      return `I'm having trouble accessing search functions at the moment. You can search the library catalog directly at www.lib.miamioh.edu or contact a librarian for research assistance. Please use the "Talk to a human librarian" option for immediate help.`;
    }

    // Generic fallback response
    return `I'm experiencing some technical difficulties and can't fully process your request right now. However, I don't want to leave you without help! Please use the "Talk to a human librarian" option below, or contact King Library directly at (513) 529-4141. Our librarians are available to assist you with research, reservations, and any other questions you may have.`;
  }

  @SubscribeMessage('messageRating')
  async handleMessageRating(
    @MessageBody()
    messageRating: {
      messageId: string;
      isPositiveRated: boolean;
    },
  ) {
    this.databaseService.updateMessageRating(
      messageRating.messageId,
      messageRating.isPositiveRated,
    );
  }

  @SubscribeMessage('userFeedback')
  async handleUserFeedback(
    @MessageBody() userFeedback: UserFeedback,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.clientIdToConversationDataMapping.has(client.id)) {
      const error = new Error(
        'Cannot find cliend Id in the clientIdToConversationDataMapping',
      );
      this.logger.error(error);
      throw error;
    }
    const conversationData = this.clientIdToConversationDataMapping.get(
      client.id,
    )!;

    conversationData.userFeedback = userFeedback;
    this.clientIdToConversationDataMapping.set(client.id, conversationData);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const llmChain: LlmChainService =
      await this.llmConnnectionGateway.getLlmChainForCurrentSocket(client.id);

    const totalTokenUsage: TokenUsage = llmChain.getTokenUsage();
    this.logger.log(
      `Total Token Used for the chat session is ${JSON.stringify(totalTokenUsage)}`,
    );
    if (!this.clientIdToConversationDataMapping.has(client.id)) {
      this.llmConnnectionGateway.closeLlmChainForCurrentSocket(client.id);
      return;
    }
    const conversationData = this.clientIdToConversationDataMapping.get(
      client.id,
    )!;

    // Add token usage data into database
    for (const [llmModelType, modelTokenUsage] of Object.entries(
      totalTokenUsage,
    )) {
      this.databaseService.addTokenDataInConversation(
        conversationData.conversationId,
        llmModelType as LlmModelType,
        modelTokenUsage.completionTokens,
        modelTokenUsage.promptTokens,
        modelTokenUsage.totalTokens,
      );
    }

    // Add UserFeedback to the database
    if (conversationData.userFeedback !== undefined) {
      this.databaseService.addUserFeedbackToDatabase(
        conversationData.conversationId,
        conversationData.userFeedback,
      );
    }

    // Add toolsUsed data to the database
    this.databaseService.addToolsUsedInConversation(
      conversationData.conversationId,
      llmChain.getToolsUsed(),
    );

    // Close the gateway
    this.llmConnnectionGateway.closeLlmChainForCurrentSocket(client.id);
  }
}

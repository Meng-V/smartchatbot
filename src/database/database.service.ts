import { Injectable, Logger } from '@nestjs/common';
import { Message, ModelTokenUsage } from '@prisma/client';
import { UserFeedback } from '../gateway/chat/chat.gateway';
import { Role } from '../llm-chain/memory/memory.interface';
import { LlmModelType } from 'src/llm-chain/llm/llm.module';
import { PrismaService } from './prisma-service/prisma.service';

/**
 * Handle all the operation regarding interaction with the database
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  constructor(private readonly prismaService: PrismaService) {}

  // Room data methods removed - Room/Building tables don't exist in Neon database
  // Room information is now handled directly via LibCal API

  /**
   *
   * @param messageType
   * @param messageContent
   * @param conversationId If conversationId is undefined or not included. New Conversation will be created and attach to the input message
   * @returns [messageId, conversationId] conversationId is the ID of the conversation the message belong to
   */
  async addMessageToDatabase(
    messageType: Role,
    messageContent: string,
    conversationId?: string,
  ): Promise<[string, string]> {
    if (conversationId === undefined) {
      conversationId = await this.addConversationToDatabase();
    }

    const newMessage = await this.prismaService.message.create({
      data: {
        type: messageType,
        content: messageContent,
        conversation: {
          connect: {
            id: conversationId,
          },
        },
      },
    });

    const updatedConversation = await this.prismaService.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        messageList: {
          connect: {
            id: newMessage.id,
          },
        },
      },
    });

    return [newMessage.id, updatedConversation.id];
  }

  /**
   * Add new conversation to the database
   * @param toolUsed
   * @param messageList
   * @param tokenUsages
   * @returns conversationId
   */
  async addConversationToDatabase(
    toolUsed: string[] = [],
    messageList: Message[] = [],
    tokenUsages: ModelTokenUsage[] = [],
  ): Promise<string> {
    const createdConversation = await this.prismaService.conversation.create({
      data: {
        toolUsed: toolUsed,
        messageList: { create: messageList },
        tokenUsages: { create: tokenUsages },
      },
    });

    return createdConversation.id;
  }

  /**
   * Add or update user feedback for the existing conversation with the input conversationId
   * @param conversationId
   * @param userFeedback
   * @returns the id of the created or updated conversation feedback
   */
  async addUserFeedbackToDatabase(
    conversationId: string,
    userFeedback: UserFeedback,
  ): Promise<string> {
    const upsertedFeedback =
      await this.prismaService.conversationFeedback.upsert({
        where: {
          conversationId: conversationId,
        },
        update: {
          rating: userFeedback.userRating,
          userComment: userFeedback.userComment ? userFeedback.userComment : '',
        },
        create: {
          rating: userFeedback.userRating,
          userComment: userFeedback.userComment ? userFeedback.userComment : '',
          conversationId: conversationId,
        },
      });

    return upsertedFeedback.id;
  }

  /**
   * Add token usage information into Conversation table
   * @param conversationId
   * @param llmModelType
   * @param completionTokens
   * @param promptTokens
   * @param totalTokens
   */
  async addTokenDataInConversation(
    conversationId: string,
    llmModelType: LlmModelType,
    completionTokens: number,
    promptTokens: number,
    totalTokens: number,
  ): Promise<void> {
    await this.prismaService.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        tokenUsages: {
          create: {
            llmModelName: llmModelType as string,
            completionTokens: completionTokens,
            promptTokens: promptTokens,
            totalTokens: totalTokens,
          },
        },
      },
    });
  }

  /**
   * Append toolsUsed into the Conversation record
   * @param toolsUsed
   */
  async addToolsUsedInConversation(
    conversationId: string,
    toolsUsed: Iterable<string>,
  ): Promise<void> {
    try {
      // Find the conversation by ID
      const conversation = await this.prismaService.conversation.findUnique({
        where: { id: conversationId },
        select: { toolUsed: true }, // Selecting only the toolUsed field
      });

      if (!conversation) {
        const error = new Error('Conversation not found');
        this.logger.error(error);
        throw error;
      }

      // Merge existing toolsUsed with new tools
      const updatedToolsUsed = Array.from(
        new Set([...conversation.toolUsed, ...toolsUsed]),
      );

      // Update the conversation with the new toolsUsed
      await this.prismaService.conversation.update({
        where: { id: conversationId },
        data: {
          toolUsed: updatedToolsUsed,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Updating message rating
   * @param messageId
   * @param isPositiveRated
   */
  async updateMessageRating(
    messageId: string,
    isPositiveRated: boolean,
  ): Promise<void> {
    try {
      // Use update since isPositiveRated is a field on the Message model
      // This will work for both first-time ratings and updates
      await this.prismaService.message.update({
        where: { id: messageId },
        data: { isPositiveRated: isPositiveRated },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        this.logger.warn(
          `Message with ID ${messageId} not found for rating update`,
        );
      } else {
        this.logger.error('Error updating message rating:', error);
      }
    }
  }

  /**
   * Health check method for database connectivity
   * @returns Promise that resolves if database is accessible
   */
  async healthCheck(): Promise<void> {
    await this.prismaService.$queryRaw`SELECT 1`;
  }
}

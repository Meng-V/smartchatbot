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
import { LlmTool } from 'src/llm-chain/llm-toolbox/llm-tool.interface';

export type UserFeedback = {
  userRating: number;
  userComment?: string;
};

type ConversationData = {
  conversationId: string;
  userFeedback?: UserFeedback;
};

@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  private clientIdToConversationDataMapping: Map<string, ConversationData> =
    new Map<string, ConversationData>();

  constructor(
    private llmConnnectionGateway: LlmConnectionGateway,
    private databaseService: DatabaseService,
  ) {}

  @SubscribeMessage('message')
  async handleUserMessage(
    @MessageBody() userMessage: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const conversationData = this.clientIdToConversationDataMapping.get(
      client.id,
    );

    const [_, newConversationId] =
      await this.databaseService.addMessageToDatabase(
        Role.Customer,
        userMessage,
        conversationData?.conversationId,
      );
    if (!this.clientIdToConversationDataMapping.has(client.id)) {
      this.clientIdToConversationDataMapping.set(client.id, {
        conversationId: newConversationId,
      });
    }

    const llmChain: LlmChainService =
      await this.llmConnnectionGateway.getLlmChainForCurrentSocket(client.id);

    const modelResponse: string = await llmChain.getModelResponse(userMessage);
    client.emit('message', modelResponse);

    await this.databaseService.addMessageToDatabase(
      Role.AIAgent,
      modelResponse,
      this.clientIdToConversationDataMapping.get(client.id)?.conversationId,
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
    let conversationData = this.clientIdToConversationDataMapping.get(
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

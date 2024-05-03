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
import { HttpService } from '@nestjs/axios';
import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { LibAnsAuthorizationService } from '../../library-api/libans-authorization/libans-authorization.service';
import { Subscription } from 'rxjs';
import { AxiosResponse } from 'axios';

export type UserFeedback = {
  userRating: number;
  userComment?: string;
};

type ConversationData = {
  conversationId: string;
  userFeedback?: UserFeedback;
};

type OfflineTicketSupportData = {
  question: string;
  email: string;
  name: string;
  details: string;
  ua: string; //Browser User Agent
};

@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  // Access token
  private libAnsAccessToken: string = '';
  private libAnsTokenSubscription: Subscription;

  private clientIdToConversationDataMapping: Map<string, ConversationData> =
    new Map<string, ConversationData>();

  constructor(
    private httpService: HttpService,
    private libAnsAuthorizationService: LibAnsAuthorizationService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private llmConnnectionGateway: LlmConnectionGateway,
    private databaseService: DatabaseService,
  ) {
    this.libAnsTokenSubscription = this.libAnsAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token: string) => {
        this.libAnsAccessToken = token;
      });
  }

  @SubscribeMessage('message')
  async handleUserMessage(
    @MessageBody() userMessage: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const conversationData = this.clientIdToConversationDataMapping.get(
      client.id,
    );

    const [, newConversationId] =
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

    try {
      const modelResponse: string =
        await llmChain.getModelResponse(userMessage);
      const [modelMessageId] = await this.databaseService.addMessageToDatabase(
        Role.AIAgent,
        modelResponse,
        this.clientIdToConversationDataMapping.get(client.id)?.conversationId,
      );
      client.emit('message', {
        messageId: modelMessageId,
        message: modelResponse,
      });
    } catch (error: any) {
      // If any errors arise, send the whole conversation string to the frontend
      // to transfer the conversation to real librarian
      const conversationHistory: string =
        await llmChain.getConversationHistory();
      client.emit('unexpected_error', conversationHistory);
      client.disconnect();
    }
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

  @SubscribeMessage('createTicket')
  async handleCreateTicketForOfflineSupport(
    @MessageBody() ticketData: OfflineTicketSupportData,
  ) {
    // Get the user's personal information
    const { question, email, details, name, ua: userAgent } = ticketData;
    const data = {
      quid: this.retrieveEnvironmentVariablesService.retrieve<string>(
        'QUEUE_ID',
      ),
      pquestion: question,
      pdetails: details,
      pname: name,
      pemail: email,
      ip: userAgent,
      confirm_email: 'true',
    };

    const HTTP_UNAUTHORIZED = 403;
    let response: AxiosResponse<any> | undefined;
    while (response === undefined || response.status === HTTP_UNAUTHORIZED) {
      try {
        // Send the request to create the ticket
        response = await this.httpService.axiosRef.post(
          'https://libanswers.lib.miamioh.edu/api/1.1/ticket/create',
          data,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${this.libAnsAccessToken}`,
            },
          },
        );
      } catch (error: any) {
        if (error.response.status === HTTP_UNAUTHORIZED) {
          this.libAnsAuthorizationService.resetToken();
          continue;
        } else {
          this.logger.error(error);
          throw error;
        }
      }
    }
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

    //Close the subscription to authorization service
    this.libAnsTokenSubscription.unsubscribe();

    // Close the gateway
    this.llmConnnectionGateway.closeLlmChainForCurrentSocket(client.id);
  }
}

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

@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private llmConnnectionGateway: LlmConnectionGateway) {}
  @SubscribeMessage('message')
  async handleEvent(
    @MessageBody() userMessage: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const llmChain: LlmChainService =
      await this.llmConnnectionGateway.getLlmChainForCurrentSocket(client);

    const modelResponse = await llmChain.getModelResponse(userMessage);
    client.emit('message', modelResponse);
  }

  async handleDisconnect(client: any): Promise<void> {
    const llmChain: LlmChainService =
      await this.llmConnnectionGateway.getLlmChainForCurrentSocket(client);

    const totalTokenUsage = llmChain.getTokenUsage();
    this.logger.log(
      `Total Token Used for the chat session is ${JSON.stringify(totalTokenUsage)}`,
    );

    this.llmConnnectionGateway.closeLlmChainForCurrentSocket(client);
  }
}

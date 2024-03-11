import { Injectable } from '@nestjs/common';
import { ContextId, ContextIdFactory, ModuleRef } from '@nestjs/core';
import { LlmChainService } from '../../llm-chain/llm-chain.service';

import { Socket } from 'socket.io';

@Injectable()
export class LlmConnectionGateway {
  private socketContextIdMapping: Map<Socket, ContextId> = new Map<
    Socket,
    ContextId
  >();
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * This function returns a unique LlmChain for each socket (or each new socket client connects)
   * @param socket
   * @returns
   */
  public getLlmChainForCurrentSocket(socket: Socket): Promise<LlmChainService> {
    if (!this.socketContextIdMapping.has(socket)) {
      const contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId(LlmChainService, contextId);
      this.socketContextIdMapping.set(socket, contextId);
    }
    const contextId: ContextId = this.socketContextIdMapping.get(socket)!;
    return this.moduleRef.resolve(LlmChainService, contextId, {
      strict: false,
    });
  }

  public closeLlmChainForCurrentSocket(socket: Socket) {
    this.socketContextIdMapping.delete(socket);
  }
}

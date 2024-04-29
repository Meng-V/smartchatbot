import { Injectable } from '@nestjs/common';
import { ContextId, ContextIdFactory, ModuleRef } from '@nestjs/core';
import { LlmChainService } from '../../llm-chain/llm-chain.service';

@Injectable()
export class LlmConnectionGateway {
  private socketIdToContextIdMapping: Map<string, ContextId> = new Map<
    string,
    ContextId
  >();
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * This function returns a unique LlmChain for each socket (or each new socket client connects)
   * @param socket
   * @returns
   */
  public async getLlmChainForCurrentSocket(
    socketId: string,
  ): Promise<LlmChainService> {
    if (!this.socketIdToContextIdMapping.has(socketId)) {
      const contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId(LlmChainService, contextId);
      this.socketIdToContextIdMapping.set(socketId, contextId);
    }
    const contextId: ContextId = this.socketIdToContextIdMapping.get(socketId)!;
    return await this.moduleRef.resolve(LlmChainService, contextId, {
      strict: false,
    });
  }

  /**
   *
   * @param socketId
   * @returns string if there exists socketId, else return undefined
   */
  public getContextId(socketId: string): ContextId | undefined {
    return this.socketIdToContextIdMapping.get(socketId);
  }

  public closeLlmChainForCurrentSocket(socketId: string): void {
    this.socketIdToContextIdMapping.delete(socketId);
  }
}

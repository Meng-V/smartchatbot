import { Test, TestingModule } from '@nestjs/testing';
import { LlmConnectionGateway } from './llm-connection.gateway';
import { GatewayModule } from '../gateway.module';
import { LlmChainModule } from '../../llm-chain/llm-chain.module';
import { SharedModule } from '../../shared/shared.module';

describe('LlmConnectionGateway', () => {
  let gateway: LlmConnectionGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule, LlmChainModule, SharedModule],
      providers: [LlmConnectionGateway],
    }).compile();

    gateway = await module.resolve<LlmConnectionGateway>(LlmConnectionGateway);
  });
  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should get different LlmChain for different socketId', () => {
    const socketId1 = 'id1';
    const socketId2 = 'id2';

    //Init the LlmChain instance
    gateway.getLlmChainForCurrentSocket(socketId1);
    gateway.getLlmChainForCurrentSocket(socketId2);

    expect(gateway.getContextId(socketId1)).not.toEqual(
      gateway.getContextId(socketId2),
    );
    expect(gateway.getContextId(socketId1)).toEqual(
      gateway.getContextId(socketId1),
    );
    expect(gateway.getContextId(socketId2)).toEqual(
      gateway.getContextId(socketId2),
    );
  });

  it('should remove the pointer to the instance', async () => {
    const socketId1 = 'id1';
    expect(await gateway.getLlmChainForCurrentSocket(socketId1)).toBeTruthy();
    expect(gateway.getContextId(socketId1)).toBeTruthy();
    gateway.closeLlmChainForCurrentSocket(socketId1);
    expect(gateway.getContextId(socketId1)).toBeFalsy();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LlmConnectionGateway } from '../connection/llm-connection.gateway';

describe('LlmConnectionGateway', () => {
  let gateway: LlmConnectionGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmConnectionGateway],
    }).compile();

    gateway = module.get<LlmConnectionGateway>(LlmConnectionGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

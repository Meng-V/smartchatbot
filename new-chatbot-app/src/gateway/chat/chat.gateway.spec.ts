import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { LlmConnectionGateway } from '../connection/llm-connection.gateway';
import { DatabaseService } from '../../database/database.service';
import { DatabaseModule } from '../../database/database.module';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ChatGateway, LlmConnectionGateway, DatabaseService],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

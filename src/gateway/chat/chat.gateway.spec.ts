import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { LlmConnectionGateway } from '../connection/llm-connection.gateway';
import { DatabaseService } from '../../database/database.service';
import { DatabaseModule } from '../../database/database.module';
import { ErrorMonitoringService } from '../../shared/services/error-monitoring/error-monitoring.service';
import { PerformanceMonitoringService } from '../../shared/services/performance-monitoring/performance-monitoring.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        ChatGateway,
        LlmConnectionGateway,
        DatabaseService,
        ErrorMonitoringService,
        PerformanceMonitoringService,
        {
          provide: 'WebSocketMemoryMonitorService',
          useValue: {
            getStats: jest.fn().mockReturnValue({
              connectionCount: 0,
              heapUsedMB: 50,
            }),
            addConnection: jest.fn(),
            removeConnection: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

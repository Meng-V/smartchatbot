import { Test, TestingModule } from '@nestjs/testing';
import { TokenUsageService } from './token-usage.service';

describe('TokenUsageService', () => {
  let service: TokenUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenUsageService],
    }).compile();

    service = module.get<TokenUsageService>(TokenUsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

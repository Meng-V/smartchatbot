import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiApiService } from './openai-api.service';

describe('OpenaiApiService', () => {
  let service: OpenaiApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenaiApiService],
    }).compile();

    service = module.get<OpenaiApiService>(OpenaiApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LlmAnswerParserService } from './llm-answer-parser.service';

describe('LlmAnswerParserService', () => {
  let service: LlmAnswerParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmAnswerParserService],
    }).compile();

    service = module.get<LlmAnswerParserService>(LlmAnswerParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

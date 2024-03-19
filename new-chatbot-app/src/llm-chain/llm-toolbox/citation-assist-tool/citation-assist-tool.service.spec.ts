import { Test, TestingModule } from '@nestjs/testing';
import { CitationAssistToolService } from './citation-assist-tool.service';

describe('CitationAssistToolService', () => {
  let service: CitationAssistToolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CitationAssistToolService],
    }).compile();

    service = module.get<CitationAssistToolService>(CitationAssistToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

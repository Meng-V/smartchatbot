import { Test, TestingModule } from '@nestjs/testing';
import { RetrieveEnvironmentVariablesService } from './retrieve-environment-variables.service';

describe('RetrieveEnvironmentVariablesService', () => {
  let service: RetrieveEnvironmentVariablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetrieveEnvironmentVariablesService],
    }).compile();

    service = module.get<RetrieveEnvironmentVariablesService>(
      RetrieveEnvironmentVariablesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

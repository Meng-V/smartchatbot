import { Test, TestingModule } from '@nestjs/testing';
import { LibcalAuthorizationService } from './libcal-authorization.service';

describe('LibcalApiService', () => {
  let service: LibcalAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibcalAuthorizationService],
    }).compile();

    service = module.get<LibcalAuthorizationService>(LibcalAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

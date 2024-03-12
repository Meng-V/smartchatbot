import { Test, TestingModule } from '@nestjs/testing';
import { LibcalApiAuthorizationService } from './libcal-api-auth.service';

describe('LibcalApiService', () => {
  let service: LibcalApiAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibcalApiAuthorizationService],
    }).compile();

    service = module.get<LibcalApiAuthorizationService>(LibcalApiAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

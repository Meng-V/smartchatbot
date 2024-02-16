import { Test, TestingModule } from '@nestjs/testing';
import { NetworkServiceService } from './network.service';

describe('NetworkServiceService', () => {
  let service: NetworkServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NetworkServiceService],
    }).compile();

    service = module.get<NetworkServiceService>(NetworkServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

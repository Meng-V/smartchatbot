import { Test, TestingModule } from '@nestjs/testing';
import { CheckRoomAvailabilityToolService } from './check-room-availability-tool.service';

describe('CheckRoomAvailabilityToolService', () => {
  let service: CheckRoomAvailabilityToolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckRoomAvailabilityToolService],
    }).compile();

    service = module.get<CheckRoomAvailabilityToolService>(CheckRoomAvailabilityToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RoomReservationService } from './room-reservation.service';

describe('RoomReservationService', () => {
  let service: RoomReservationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomReservationService],
    }).compile();

    service = module.get<RoomReservationService>(RoomReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

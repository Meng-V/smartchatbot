import { Test, TestingModule } from '@nestjs/testing';
import { CancelReservationService } from './cancel-reservation.service';

describe('CancelReservationService', () => {
  let service: CancelReservationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CancelReservationService],
    }).compile();

    service = module.get<CancelReservationService>(CancelReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

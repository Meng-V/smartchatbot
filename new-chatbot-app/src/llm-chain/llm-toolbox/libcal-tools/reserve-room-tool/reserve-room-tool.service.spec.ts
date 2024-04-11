import { Test, TestingModule } from '@nestjs/testing';
import { ReserveRoomToolService } from './reserve-room-tool.service';

describe('ReserveRoomToolService', () => {
  let service: ReserveRoomToolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReserveRoomToolService],
    }).compile();

    service = module.get<ReserveRoomToolService>(ReserveRoomToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

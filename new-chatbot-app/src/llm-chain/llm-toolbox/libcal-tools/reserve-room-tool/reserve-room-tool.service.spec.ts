import { ReserveRoomToolService } from './reserve-room-tool.service';
import { CheckRoomAvailabilityToolService } from '../check-room-availability-tool/check-room-availability-tool.service';
import { HttpService } from '@nestjs/axios';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { SharedModule } from '../../../../shared/shared.module';

describe('ReserveRoomToolService', () => {
  let service: ReserveRoomToolService;
  let mockHttpService = {
    axiosRef: { post: jest.fn() },
  };
  let mockLibcalApiAuthorizationService = {
    getAccessTokenObservable: jest.fn(),
  };
  let mockCheckRoomAvailabilityToolService = {
    fetchAvailableRooms: jest.fn(),
  };

  beforeEach(async () => {
    const accessToken = 'test_token';
    const httpResult = {
      data: {
        booking_id: 'testBookingId',
        cost: 0,
      },
    };

    mockLibcalApiAuthorizationService.getAccessTokenObservable = jest
      .fn()
      .mockReturnValue(of(accessToken));
    mockHttpService.axiosRef.post = jest.fn().mockResolvedValue(httpResult);

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        ReserveRoomToolService,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: LibcalAuthorizationService,
          useValue: mockLibcalApiAuthorizationService,
        },
        {
          provide: CheckRoomAvailabilityToolService,
          useValue: mockCheckRoomAvailabilityToolService,
        },
      ],
    }).compile();

    service = module.get<ReserveRoomToolService>(ReserveRoomToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should say no room available', async () => {
    const roomAvailabilityResponse: {
      id: number;
      roomCodeName: string;
      capacity: number;
    }[] = [];
    mockCheckRoomAvailabilityToolService.fetchAvailableRooms.mockResolvedValueOnce(
      roomAvailabilityResponse,
    );
    const expectedResponse = 'No room satisfies';
    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: '2024-06-07',
        startTime: '17:00',
        endTime: '18:00',
        roomCapacity: '4',
      }),
    ).toEqual(expectedResponse);
  });

  it('should successfully book room', async () => {
    const roomAvailabilityResponse = [
      {
        id: 1111,
        roomCodeName: 'King 102',
        capacity: 12,
      },
      {
        id: 2222,
        roomCodeName: 'King 103',
        capacity: 8,
      },
      {
        id: 3333,
        roomCodeName: 'King 104',
        capacity: 4,
      },
    ];

    mockCheckRoomAvailabilityToolService.fetchAvailableRooms.mockResolvedValueOnce(
      roomAvailabilityResponse,
    );

    const startTime = '17:00';
    const endTime = '18:00';
    const date = '2024-06-07';
    const expectedResponse = `King 104 with capacity 4 is booked from ${startTime} to ${endTime} on ${date}. Tell the customer that the reservation is successful and bookingId is testBookingId`;

    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: date,
        startTime: startTime,
        endTime: endTime,
        roomCapacity: '4',
      }),
    ).toEqual(expectedResponse);
  });
});

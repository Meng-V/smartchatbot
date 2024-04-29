import { ReserveRoomToolService } from './reserve-room-tool.service';
import { CheckRoomAvailabilityToolService } from '../check-room-availability-tool/check-room-availability-tool.service';
import { HttpService } from '@nestjs/axios';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { SharedModule } from '../../../../shared/shared.module';
import { DatabaseService } from '../../../../database/database.service';
import { HttpException } from '@nestjs/common';

describe('ReserveRoomToolService', () => {
  let service: ReserveRoomToolService;
  const mockHttpService = {
    axiosRef: { post: jest.fn() },
  };
  const mockLibcalApiAuthorizationService = {
    getAccessTokenObservable: jest.fn(),
  };
  const mockCheckRoomAvailabilityToolService = {
    fetchAvailableRooms: jest.fn(),
  };
  const mockDatabaseService = {
    getRoomIdFromRoomCodeName: jest.fn(),
  };

  beforeEach(async () => {
    const accessToken = 'test_token';
    mockLibcalApiAuthorizationService.getAccessTokenObservable = jest
      .fn()
      .mockReturnValue(of(accessToken));

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
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ReserveRoomToolService>(ReserveRoomToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should notify that booking is not available', async () => {
    let errorResponse = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
      data: "booking 6 'from' is not a valid starting slot",
    };
    mockHttpService.axiosRef.post.mockRejectedValue(
      new HttpException(errorResponse, 400),
    );

    mockDatabaseService.getRoomIdFromRoomCodeName.mockResolvedValue({
      id: 1111,
      roomCodeName: 'King 111',
      capacity: 8,
    });

    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: '2024-06-07',
        startTime: '17:00',
        endTime: '18:00',
        roomCodeName: '111',
      }),
    ).toEqual(
      'Booking unsuccessfully.Time slot is not available for your room',
    );

    errorResponse = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
      data: '<p>King 240: Sorry, this exceeds the 120 minute booking limit.</p>',
    };
    mockHttpService.axiosRef.post.mockRejectedValue(
      new HttpException(errorResponse, 400),
    );
    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: '2024-06-07',
        startTime: '17:00',
        endTime: '18:00',
        roomCodeName: '111',
      }),
    ).toEqual(
      'Booking unsuccessfully.Booking exceeds the 120 minute booking limit.Each person only has 120 minute booking limit everyday.',
    );
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

  it('should notify if required parameters are missing', async () => {
    let expectedResponse = `Cannot use this tool because missing paramters ${JSON.stringify(['email', 'date'])}.Ask the customer to provide these data.`;
    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        startTime: '17:00',
        endTime: '18:00',
        roomCapacity: '4',
      }),
    ).toEqual(expectedResponse);

    expectedResponse = `Cannot use this tool because missing paramters ${JSON.stringify(['endTime'])}.Ask the customer to provide these data.`;
    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: '2024-06-07',
        startTime: '17:00',
        roomCapacity: '4',
      }),
    ).toEqual(expectedResponse);
  });

  it('should notify when missing both parameters roomCodeName and roomCapacity', async () => {
    const expectedResponse =
      'roomCapacity and roomCodeName cannot be both empty.Ask customer to specify one of them.';

    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: '2024-06-07',
        startTime: '17:00',
        endTime: '18:00',
      }),
    ).toEqual(expectedResponse);
  });

  it('shoud successfully book room with roomCodeName', async () => {
    const httpResult = {
      data: {
        booking_id: 'testBookingId',
        cost: 0,
      },
    };
    mockHttpService.axiosRef.post.mockResolvedValue(httpResult);

    mockDatabaseService.getRoomIdFromRoomCodeName.mockResolvedValue({
      id: 1111,
      roomCodeName: 'King 111',
      capacity: 8,
    });

    const startTime = '17:00';
    const endTime = '18:00';
    const date = '2024-06-07';
    const expectedResponse = `King 111 with capacity 8 is booked from ${startTime} to ${endTime} on ${date}. Tell the customer that the reservation is successful and bookingId is testBookingId`;

    expect(
      await service.toolRunForLlm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@miamioh.edu',
        date: date,
        startTime: startTime,
        endTime: endTime,
        roomCodeName: '111',
      }),
    ).toEqual(expectedResponse);
  });

  it('should successfully book room with roomCapacity', async () => {
    const httpResult = {
      data: {
        booking_id: 'testBookingId',
        cost: 0,
      },
    };
    mockHttpService.axiosRef.post.mockResolvedValue(httpResult);

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

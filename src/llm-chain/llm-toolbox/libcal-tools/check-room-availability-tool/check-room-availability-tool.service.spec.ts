import { TestBed } from '@automock/jest';
import { CheckRoomAvailabilityToolService } from './check-room-availability-tool.service';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { of } from 'rxjs';

describe('CheckRoomAvailabilityToolService', () => {
  let service: CheckRoomAvailabilityToolService;

  beforeEach(async () => {
    const token = 'test_token';
    const apiResponse = {
      data: {
        exact_matches: [
          {
            space: {
              id: 11111,
              name: 'King 100',
              image: '',
              capacity: 8,
              zoneId: 1,
            },
            category: {
              cid: 1,
              name: 'King Study Rooms (Swipe Accessible)',
            },
            start: '2024-04-15T17:00:00-04:00',
            end: '2024-04-15T18:00:00-04:00',
          },
          {
            space: {
              id: 22222,
              name: 'King 102',
              image: '',
              capacity: 12,
              zoneId: 2,
            },
            category: {
              cid: 2,
              name: 'King Study Rooms (Swipe Accessible)',
            },
            start: '2024-04-15T17:00:00-04:00',
            end: '2024-04-15T18:00:00-04:00',
          },
          {
            space: {
              id: 33333,
              name: 'King 103',
              image: '',
              capacity: 4,
              zoneId: 3,
            },
            category: {
              cid: 3,
              name: 'King Study Rooms (Swipe Accessible)',
            },
            start: '2024-04-15T17:00:00-04:00',
            end: '2024-04-15T18:00:00-04:00',
          },
        ],
        other_matches: [],
      },
    } as AxiosResponse;

    const { unit } = TestBed.create(CheckRoomAvailabilityToolService)
      .mock(HttpService)
      .using({ axiosRef: { get: async () => apiResponse } })
      .mock(LibcalAuthorizationService)
      .using({ getAccessTokenObservable: () => of(token) })
      .compile();

    service = unit;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should recognize the missing fields', async () => {
    let expectedReponse = `Cannot use this tool because missing paramters ${JSON.stringify(['date'])}.Ask the customer to provide these data.`;

    expect(
      await service.toolRunForLlm({
        startTime: '16:00',
        endTime: '17:00',
        roomCapacity: '7',
      }),
    ).toEqual(expectedReponse);

    expectedReponse = `Cannot use this tool because missing paramters ${JSON.stringify(['startTime', 'endTime'])}.Ask the customer to provide these data.`;

    expect(
      await service.toolRunForLlm({
        date: '2024-12-01',
        roomCapacity: '7',
      }),
    ).toEqual(expectedReponse);
  });

  it('should return the correct available room', async () => {
    const date = '2024-04-15';

    const expectedResponse = `Some rooms satisfy the input conditions:${JSON.stringify(
      [
        {
          roomName: 'King 103',
          capacity: 4,
        },
        {
          roomName: 'King 100',
          capacity: 8,
        },
        {
          roomName: 'King 102',
          capacity: 12,
        },
      ],
    )}.Tell the customer all the room numbers with according capacities`;
    expect(
      await service.toolRunForLlm({
        date: date,
        startTime: '17:00',
        endTime: '18:00',
        roomCapacity: '4',
      }),
    ).toEqual(expectedResponse);
  });
});

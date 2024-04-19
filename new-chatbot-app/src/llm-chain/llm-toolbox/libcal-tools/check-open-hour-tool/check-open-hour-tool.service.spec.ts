import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

import { CheckOpenHourToolService } from './check-open-hour-tool.service';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

describe('CheckOpenHourToolService', () => {
  let service: CheckOpenHourToolService;
  let mockHttpService = {
    axiosRef: { get: jest.fn().mockReturnValue(of()) },
  };
  let mockLibcalApiAuthorizationService = {
    getAccessTokenObservable: jest.fn().mockReturnValue(of('mockToken')),
  };
  let mockRetrieveEnvironmentVariablesService = { retrieve: jest.fn() };

  /**
   * Create a new instance of the CheckOpenHourToolService before each test.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckOpenHourToolService,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: LibcalAuthorizationService,
          useValue: mockLibcalApiAuthorizationService,
        },
        {
          provide: RetrieveEnvironmentVariablesService,
          useValue: mockRetrieveEnvironmentVariablesService,
        },
      ],
    }).compile();

    service = module.get<CheckOpenHourToolService>(CheckOpenHourToolService);
  });

  /**
   * Test that the service is defined.
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return error message with improper input', async () => {
    // Null and undefined and empty toolInput
    let expectedResponse =
      'Cannot check the building hour without a date. Ask the customer to provide the date before checking.\n';

    expect(
      await service.toolRunForLlm({
        date: null,
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        date: 'null',
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        date: undefined,
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        date: 'undefined',
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        date: '',
      }),
    ).toEqual(expectedResponse);
  });

  /**
   * Test that the service can check the open hours of the library.
   */
  it('should output correct open hours for input date', async () => {
    const buildingID = '8113';
    const accessToken = 'accessToken';
    const checkOpenHourResponse = {
      data: [
        {
          lid: 8113,
          name: 'King Library',
          category: 'library',
          desc: '',
          url: 'https://www.lib.miamioh.edu/about/locations/king-library/',
          contact: '',
          lat: '39.508786',
          long: '-84.737978',
          color: '#781320',
          fn: '',
          dates: {
            '2024-04-08': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-09': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-10': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-11': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-12': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-13': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
            '2024-04-14': {
              status: 'open',
              hours: [
                {
                  from: '7:00am',
                  to: '1:00am',
                },
              ],
            },
          },
        },
      ],
    };

    mockLibcalApiAuthorizationService.getAccessTokenObservable.mockReturnValue(
      of(accessToken),
    );
    mockHttpService.axiosRef.get.mockResolvedValueOnce(checkOpenHourResponse);

    const result = await service.toolRunForLlm({ date: '2024-04-09' });

    const expectedResponse = `Open Hour of the requested week: ${JSON.stringify(
      {
        monday: [{ from: '7:00am', to: '1:00am' }],
        tuesday: [{ from: '7:00am', to: '1:00am' }],
        wednesday: [{ from: '7:00am', to: '1:00am' }],
        thursday: [{ from: '7:00am', to: '1:00am' }],
        friday: [{ from: '7:00am', to: '1:00am' }],
        saturday: [{ from: '7:00am', to: '1:00am' }],
        sunday: [{ from: '7:00am', to: '1:00am' }],
      },
    )}.\nIf any day does not exist in the array, the library does not open that day. Always answer with both open hour and close hour to the customer.\n`;

    expect(
      mockLibcalApiAuthorizationService.getAccessTokenObservable,
    ).toHaveBeenCalled();
    expect(result).toEqual(expectedResponse);
  });
});

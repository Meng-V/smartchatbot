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
          dates: {
            '2024-04-09': { hours: [{ from: '7:00am', to: '1:00am' }] },
          },
        },
      ],
    };

    mockLibcalApiAuthorizationService.getAccessTokenObservable.mockReturnValue(
      of(accessToken),
    );
    mockHttpService.axiosRef.get.mockResolvedValueOnce(checkOpenHourResponse);

    const result = await service.toolRunForLlm({ date: '2024-04-09' });

    const expectedResponse = `
      Open Hour of the requested week:       
      [
        {
          "from": "7:00am",
          "to": "1:00am"
        }
      ]
      If any day does not exist in the array, the library does not open that day. Always answer with both open hour and close hour to the customer.\n
    `;

    expect(
      mockLibcalApiAuthorizationService.getAccessTokenObservable,
    ).toHaveBeenCalled();
    expect(result).toEqual(expectedResponse);
  });
});

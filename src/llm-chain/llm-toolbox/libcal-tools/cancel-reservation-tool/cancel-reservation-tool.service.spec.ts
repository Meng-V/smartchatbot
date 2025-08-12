import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

import { CancelReservationToolService } from './cancel-reservation-tool.service';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

describe('CancelReservationService', () => {
  let service: CancelReservationToolService;
  const mockHttpService = {
    axiosRef: { post: jest.fn().mockReturnValue(of({ success: true })) },
  };
  const mockLibcalApiAuthorizationService = {
    getAccessTokenObservable: jest.fn().mockReturnValue(of('mockToken')),
    getCurrentToken: jest.fn().mockResolvedValue('mockToken'),
    refreshToken: jest.fn().mockResolvedValue(undefined),
  };
  const mockRetrieveEnvironmentVariablesService = { retrieve: jest.fn() };

  /**
   * Create a new instance of the CancelReservationService before each test.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelReservationToolService,
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

    service = module.get<CancelReservationToolService>(
      CancelReservationToolService,
    );
  });

  /**
   * Test that the service is defined.
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Test that the service cannot cancel a reservation due to improper input.
   */
  it('should return error message with improper input', async () => {
    // Null and undefined toolInput
    const expectedResponse = `Cannot perform booking because missing parameter bookingID. Ask the customer to provide bookingID to perform booking\n`;

    expect(
      await service.toolRunForLlm({
        bookingID: null,
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        bookingID: 'null',
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        bookingID: undefined,
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        bookingID: 'undefined',
      }),
    ).toEqual(expectedResponse);
  });

  /**
   * Test that the service can cancel a reservation.
   */
  it('should cancel reservation', async () => {
    const bookingID = '123';
    const accessToken = 'access-token';
    const cancelResponse = { data: [{ cancelled: true }] };

    mockLibcalApiAuthorizationService.getAccessTokenObservable.mockReturnValue(
      of(accessToken),
    );
    mockHttpService.axiosRef.post.mockResolvedValueOnce(cancelResponse);

    const result = await service.toolRunForLlm({ bookingID: bookingID });

    const expectedAnswer = `Room reservation with ID: ${bookingID} is cancelled successfully\n`;

    expect(
      mockLibcalApiAuthorizationService.getAccessTokenObservable,
    ).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });

  /**
   * Test that the service fails to cancel a reservation.
   */
  it('should fail to cancel reservation', async () => {
    const bookingID = '123';
    const accessToken = 'access-token';
    const cancelResponse = {
      data: [{ cancelled: false, error: 'invalid booking id' }],
    };

    mockLibcalApiAuthorizationService.getAccessTokenObservable.mockReturnValue(
      of(accessToken),
    );
    mockHttpService.axiosRef.post.mockResolvedValueOnce(cancelResponse);

    const result = await service.toolRunForLlm({ bookingID: bookingID });

    const expectedAnswer = `Room reservation with ID: ${bookingID} is not cancelled successfully. Error message: invalid booking id\n`;

    expect(
      mockLibcalApiAuthorizationService.getAccessTokenObservable,
    ).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });
});

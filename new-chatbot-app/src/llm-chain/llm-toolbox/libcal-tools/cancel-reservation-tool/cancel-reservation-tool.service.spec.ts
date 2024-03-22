import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

import { CancelReservationToolService } from './cancel-reservation-tool.service';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';

describe('CancelReservationService', () => {
  let service: CancelReservationToolService;
  let mockHttpService = { post: jest.fn() };
  let mockLibcalApiAuthorizationService = { getAccessToken: jest.fn() };

  /**
   * Create a new instance of the CancelReservationService before each test.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelReservationToolService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: LibcalAuthorizationService, useValue: mockLibcalApiAuthorizationService },
      ],
    }).compile();

    service = module.get<CancelReservationToolService>(
      CancelReservationToolService
    );
  });

  /**
   * Test that the service is defined.
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  /**
   * Test that the service can cancel a reservation.
   */
  it('should cancel reservation', async () => {
    const bookingID = '123';
    const accessToken = 'access-token';
    const cancelResponse = { success: true };

    mockLibcalApiAuthorizationService.getAccessToken.mockResolvedValue(accessToken);
    mockHttpService.post.mockReturnValue(of(cancelResponse));

    const result = await service.toolRunForLlm({ bookingID: bookingID });

    const expectedAnswer = `Room reservation with ID: ${bookingID} is cancelled successfully\n`;

    expect(mockLibcalApiAuthorizationService.getAccessToken).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });

  /**
   * Test that the service fails to cancel a reservation.
   */
  it('should fail to cancel reservation', async () => {
    const bookingID = '123';
    const accessToken = 'access-token';
    const cancelResponse = { data: [{ cancelled: false, error: 'Cancellation failed' }] };

    mockLibcalApiAuthorizationService.getAccessToken.mockResolvedValue(accessToken);
    mockHttpService.post.mockReturnValue(of(cancelResponse));

    const result = await service.toolRunForLlm({ bookingID: bookingID });

    const expectedAnswer = `Room reservation with ID: ${bookingID} is not cancelled unsuccessfully. Error message: Cancellation failed\n`;

    expect(mockLibcalApiAuthorizationService.getAccessToken).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });

  /**
   * Test that the service fails to cancel a reservation with null booking ID.
   */
  it('should fail to cancel reservation with null booking ID', async () => {
    const bookingID = null;
    const accessToken = 'access-token';
    mockLibcalApiAuthorizationService.getAccessToken.mockResolvedValue(accessToken);
    const result = await service.toolRunForLlm({ bookingID: bookingID });
    const expectedAnswer = `Booking ID is null. Please provide a valid booking ID.\n`;
    expect(mockLibcalApiAuthorizationService.getAccessToken).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });

});

import { Test, TestingModule } from '@nestjs/testing';

import { CancelReservationService } from './cancel-reservation.service';
import { LibraryApiModule } from 'src/library-api/library-api.module';
import { NetworkService } from 'src/shared/services/network/network.service';
import { LibcalApiAuthorizationService } from '../../../../library-api/libcal-api-auth/libcal-api-auth.service';

describe('CancelReservationService', () => {
  let service: CancelReservationService;
  let mockNetworkService = { post: jest.fn() };
  let mockLibcalApiAuthorizationService = { getAccessToken: jest.fn() };

  /**
   * Create a new instance of the CancelReservationService before each test.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LibraryApiModule],
      providers: [
        CancelReservationService,
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: LibcalApiAuthorizationService, useValue: mockLibcalApiAuthorizationService },
      ],
    }).compile();

    service = module.get<CancelReservationService>(
      CancelReservationService
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

    const result = await service.serviceRun({ bookingID: bookingID });

    const expectedAnswer = `Room reservation with ID: ${bookingID} is cancelled successfully\n`;

    expect(mockLibcalApiAuthorizationService.getAccessToken).toHaveBeenCalled();
    expect(result).toEqual(expectedAnswer);
  });

});

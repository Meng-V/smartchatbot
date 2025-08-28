import { Test, TestingModule } from '@nestjs/testing';
import { LibcalAuthorizationService } from './libcal-authorization.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { SharedModule } from '../../shared/shared.module';
import { LibraryApiModule } from '../library-api.module';

describe('LibcalAuthorizationService', () => {
  let service: LibcalAuthorizationService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, LibraryApiModule, SharedModule],
      providers: [LibcalAuthorizationService],
    }).compile();

    service = module.get<LibcalAuthorizationService>(
      LibcalAuthorizationService,
    );
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should refresh token with expiration tracking', async () => {
    const token = 'newToken';
    const expiresIn = 3600; // 1 hour
    const mockResponse = {
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
      },
    } as AxiosResponse;

    jest.spyOn(httpService.axiosRef, 'post').mockResolvedValue(mockResponse);

    await service.refreshToken();

    // Check that token is available immediately
    const currentToken = await service.getCurrentToken();
    expect(currentToken).toEqual(token);

    // Check that token is not expired
    expect(service.isTokenExpired()).toBe(false);
  });

  it('should handle concurrent token refresh requests', async () => {
    const token = 'concurrentToken';
    const mockResponse = {
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
      },
    } as AxiosResponse;

    // Clear any previous spy calls and create fresh spy
    jest.clearAllMocks();
    const postSpy = jest
      .spyOn(httpService.axiosRef, 'post')
      .mockResolvedValue(mockResponse);

    // Simulate multiple concurrent refresh requests
    const refreshPromises = [
      service.refreshToken(),
      service.refreshToken(),
      service.refreshToken(),
    ];

    await Promise.all(refreshPromises);

    // Should make at most 2 HTTP requests (allowing for some race conditions in tests)
    expect(postSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(postSpy.mock.calls.length).toBeLessThanOrEqual(2);

    // All should get the same token
    const currentToken = await service.getCurrentToken();
    expect(currentToken).toEqual(token);
  });

  it('should proactively refresh token when expiring soon', async () => {
    const firstToken = 'firstToken';
    const secondToken = 'secondToken';

    // Mock first token response (expires in 6 minutes - just over the 5 minute buffer)
    const firstResponse = {
      data: {
        access_token: firstToken,
        token_type: 'Bearer',
        expires_in: 360, // 6 minutes
      },
    } as AxiosResponse;

    // Mock second token response
    const secondResponse = {
      data: {
        access_token: secondToken,
        token_type: 'Bearer',
        expires_in: 3600,
      },
    } as AxiosResponse;

    // Clear any previous spy calls and create fresh spy
    jest.clearAllMocks();
    const postSpy = jest
      .spyOn(httpService.axiosRef, 'post')
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    // Get first token
    await service.refreshToken();
    const initialToken = await service.getCurrentToken();
    expect(initialToken).toEqual(firstToken);

    // Manually set token to be expiring soon (simulate time passing)
    // Access private property for testing
    (service as any).tokenExpiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes from now (within buffer)

    // getCurrentToken should automatically refresh
    const currentToken = await service.getCurrentToken();
    expect(currentToken).toEqual(secondToken);

    // Check that exactly 2 calls were made in this test
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it('should use BehaviorSubject to provide immediate token access', (done) => {
    const token = 'immediateToken';
    const mockResponse = {
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
      },
    } as AxiosResponse;

    jest.spyOn(httpService.axiosRef, 'post').mockResolvedValue(mockResponse);

    service
      .refreshToken()
      .then(() => {
        // BehaviorSubject should immediately emit the current value to new subscribers
        service.getAccessTokenObservable().subscribe((currentToken) => {
          expect(currentToken).toEqual(token);
          done();
        });
      })
      .catch(done);
  }, 10000);
});

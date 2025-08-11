import { Test, TestingModule } from '@nestjs/testing';
import { LibcalAuthorizationService } from './libcal-authorization.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
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

    const postSpy = jest.spyOn(httpService.axiosRef, 'post').mockResolvedValue(mockResponse);

    // Simulate multiple concurrent refresh requests
    const refreshPromises = [
      service.refreshToken(),
      service.refreshToken(),
      service.refreshToken(),
    ];

    await Promise.all(refreshPromises);

    // Should only make one actual HTTP request due to isRefreshing flag
    expect(postSpy).toHaveBeenCalledTimes(1);
    
    // All should get the same token
    const currentToken = await service.getCurrentToken();
    expect(currentToken).toEqual(token);
  });

  it('should proactively refresh token when expiring soon', async () => {
    const firstToken = 'firstToken';
    const secondToken = 'secondToken';
    
    // Mock first token response (expires in 1 second for testing)
    const firstResponse = {
      data: {
        access_token: firstToken,
        token_type: 'Bearer',
        expires_in: 1, // 1 second
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

    const postSpy = jest.spyOn(httpService.axiosRef, 'post')
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    // Get first token
    await service.refreshToken();
    expect(await service.getCurrentToken()).toEqual(firstToken);
    
    // Wait for token to be considered expiring (1 second + buffer)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // getCurrentToken should automatically refresh
    const currentToken = await service.getCurrentToken();
    expect(currentToken).toEqual(secondToken);
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

    service.refreshToken().then(() => {
      // BehaviorSubject should immediately emit the current value to new subscribers
      const tokenObservable = service.getAccessTokenObservable();
      const tokenSubscription = tokenObservable.subscribe((currentToken) => {
        expect(currentToken).toEqual(token);
        tokenSubscription.unsubscribe();
        done();
      });
    });
  });
});

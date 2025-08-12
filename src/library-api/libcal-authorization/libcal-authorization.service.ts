import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { AxiosResponse } from 'axios';

interface LibCalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope?: string;
}

@Injectable()
export class LibcalAuthorizationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly OAUTH_URL: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_OAUTH_URL');
  private readonly CLIENT_ID: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_CLIENT_ID');
  private readonly CLIENT_SECRET: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_CLIENT_SECRET');
  private readonly GRANT_TYPE: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_GRANT_TYPE');

  private readonly logger = new Logger(LibcalAuthorizationService.name);
  private token$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private tokenExpiresAt: number = 0;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

  constructor(
    private readonly retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private httpService: HttpService,
  ) {}

  /**
   * Wait for the service to successfully fetch the key before finishing initializing the module
   */
  async onModuleInit(): Promise<void> {
    await this.refreshToken();
  }

  /**
   * Get the Observable for access token for LibCal API
   * @returns the Observable of the access token
   * @throws if cannot connect to the authorization API
   */
  public getAccessTokenObservable(): Observable<string> {
    return this.token$.asObservable();
  }

  /**
   * Get the current access token, refreshing if necessary
   * @returns Promise that resolves to the current valid access token
   */
  public async getCurrentToken(): Promise<string> {
    if (this.isTokenExpiredOrExpiringSoon()) {
      await this.refreshToken();
    }
    return this.token$.value;
  }

  /**
   * Check if the current token is expired or expiring soon
   * @returns true if token needs refresh
   */
  private isTokenExpiredOrExpiringSoon(): boolean {
    const now = Date.now();
    return now >= this.tokenExpiresAt - this.TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Check if the current token is completely expired
   * @returns true if token is expired
   */
  public isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Reset the access token for Libcal (legacy method for backward compatibility)
   * @deprecated Use refreshToken() instead
   */
  public resetToken(): Promise<void> {
    return this.refreshToken();
  }

  /**
   * Refresh the access token for LibCal with proper expiration tracking
   */
  public async refreshToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      // Wait for the current refresh to complete
      while (this.isRefreshing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return;
    }

    this.isRefreshing = true;

    try {
      this.logger.log('Refreshing LibCal access token...');

      const response =
        await this.httpService.axiosRef.post<LibCalTokenResponse>(
          this.OAUTH_URL,
          {
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            grant_type: this.GRANT_TYPE,
          },
        );

      const tokenData = response.data;
      const now = Date.now();

      // Calculate expiration time (expires_in is in seconds)
      this.tokenExpiresAt = now + tokenData.expires_in * 1000;

      // Update the token
      this.token$.next(tokenData.access_token);

      this.logger.log(
        `LibCal token refreshed successfully. Expires at: ${new Date(this.tokenExpiresAt).toISOString()}`,
      );

      // Schedule the next proactive refresh
      this.scheduleTokenRefresh();
    } catch (error: any) {
      this.logger.error('Failed to refresh LibCal token:', error.message);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Schedule the next proactive token refresh
   */
  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const refreshAt = this.tokenExpiresAt - this.TOKEN_REFRESH_BUFFER_MS;
    const delay = Math.max(0, refreshAt - Date.now());

    this.logger.log(
      `Scheduling next LibCal token refresh in ${Math.floor(delay / (60 * 1000))} minutes`,
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        this.logger.error('Scheduled token refresh failed:', error);
        // Retry in 1 minute if scheduled refresh fails
        setTimeout(() => this.refreshToken().catch(() => {}), 60000);
      }
    }, delay);
  }

  /**
   * Clean up resources when the module is destroyed
   */
  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}

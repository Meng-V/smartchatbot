import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Subject, Observable, map } from 'rxjs';

import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { AxiosResponse } from 'axios';

@Injectable()
export class LibcalAuthorizationService implements OnModuleInit {
  private readonly OAUTH_URL: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_OAUTH_URL');
  private readonly CLIENT_ID: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_CLIENT_ID');
  private readonly CLIENT_SECRET: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_CLIENT_SECRET');
  private readonly GRANT_TYPE: string =
    this.retrieveEnvironmentVariablesService.retrieve('LIBCAL_GRANT_TYPE');

  private token$: Subject<string> = new Subject();

  constructor(
    private readonly retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private httpService: HttpService,
  ) {}

  /**
   * Wait for the service to successfully fetch the key before finishing initializing the module
   */
  async onModuleInit(): Promise<void> {
    await this.resetToken();
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
   * Reset the access token for Libcal
   */
  public resetToken(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.httpService
        .post(this.OAUTH_URL, {
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          grant_type: this.GRANT_TYPE,
        })
        .pipe(map((response: AxiosResponse) => response.data.access_token))
        .subscribe({
          next: (token: string) => {
            this.token$.next(token);
            resolve();
          },
          error: (error: any) => {
            reject(error);
          },
        });
    });
  }
}

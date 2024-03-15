import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { NetworkService } from 'src/shared/services/network/network.service';

export type Room = { roomID: string; roomName: string; capacity: number };

@Injectable()
export class LibcalApiAuthorizationService {
  protected readonly OAUTH_URL = process.env['LIBCAL_OAUTH_URL']!;
  protected readonly CLIENT_ID = process.env['LIBCAL_CLIENT_ID']!;
  protected readonly CLIENT_SECRET = process.env['LIBCAL_CLIENT_SECRET']!;
  protected readonly GRANT_TYPE = process.env['LIBCAL_GRANT_TYPE']!;
  protected readonly ROOM_INFO_URL = process.env['LIBCAL_ROOM_INFO_URL'];
  protected readonly AVAILABLE_URL = process.env['LIBCAL_AVAILABLE_URL']!;
  protected readonly RESERVATION_URL = process.env['LIBCAL_RESERVATION_URL']!;
  protected readonly CANCEL_URL = process.env['LIBCAL_CANCEL_URL']!;
  protected readonly HOUR_URL = process.env['LIBCAL_HOUR_URL']!;
  protected readonly BUILDING_ID = process.env['TEST_BUILDING'];


  protected static timezone = (() => {
    const diff = new Date().getTimezoneOffset() / 60;
    return diff < 0 ? `${diff}`.slice(1) : `${diff}`;
  })();

  /**
   * Get the singleton instance of the LibcalApiAuthorizationService.
   * @returns
   */
  constructor(
    private networkService: NetworkService,
  ) {
  }

  /**
   * Get the access token for the LibCal API.
   * @returns a promise that resolves to the access token
   */
  public async getAccessToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      let response: AxiosResponse<any, any>;
      try {
        response = await this.networkService.retryWithMaxAttempts<
          AxiosResponse<any, any>
        >((): Promise<AxiosResponse<any, any>> => {
          return new Promise<AxiosResponse<any, any>>((resolve, reject) => {
            try {
              const axiosResponse = axios({
                method: 'post',
                url: this.OAUTH_URL,
                data: {
                  grant_type: this.GRANT_TYPE,
                  client_id: this.CLIENT_ID,
                  client_secret: this.CLIENT_SECRET
                }
                // auth: {
                //   username: this.CLIENT_ID,
                //   password: this.CLIENT_SECRET,
                // },
              });
              resolve(axiosResponse);
            } catch (error: any) {
              reject(error);
            }
          });
        }, 5);
      } catch (error: any) {
        reject(error);
        return;
      }

      resolve(response.data.access_token!);
    });
  }
}

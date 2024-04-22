import { Injectable, Logger, OnModuleDestroy, Scope } from '@nestjs/common';
import { NetworkService } from 'src/shared/services/network/network.service';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { LlmTool } from '../../llm-tool.interface';
import { HttpService } from '@nestjs/axios';
import { Subscription } from 'rxjs';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { AxiosResponse } from 'axios';

/**
 * Returned data type from service
 */
type LibcalAPICancelReservationResponse = {
  booking_id: string;
  cancelled: boolean;
  error?: string;
}[];

@Injectable()
export class CancelReservationToolService implements LlmTool, OnModuleDestroy {
  // Env Variables
  private readonly CANCEL_URL =
    this.retrieveEnvironmentVariablesService.retrieve<string>(
      'LIBCAL_CANCEL_URL',
    );
  // From LlmTool interface
  public readonly toolName: string = 'CancelReservationTool';
  readonly toolDescription: string =
    'This tool is for cancelling study room reservation.Currently,this tool only supports King Library Building;if the customer mentions about any other building,tell them you cannot support them.';
  readonly toolParametersStructure: { [parameterName: string]: string } = {
    bookingID: 'string [REQUIRED]',
  };

  // Access token
  private accessToken: string = '';
  private tokenSubscription: Subscription;

  private readonly logger = new Logger(CancelReservationToolService.name);

  /**
   * Instantiate the CancelReservationToolService.
   */
  constructor(
    private libcalAuthorizationService: LibcalAuthorizationService,
    private httpService: HttpService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {
    this.tokenSubscription = this.libcalAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token: string) => {
        this.accessToken = token;
      });
  }

  /**
   * Run the cancel reservation service.
   * @param toolInput
   * @returns
   */
  public async toolRunForLlm(toolInput: {
    bookingID: string | null | undefined;
  }): Promise<string> {
    if (
      toolInput.bookingID === null ||
      toolInput.bookingID === 'null' ||
      toolInput.bookingID === undefined ||
      toolInput.bookingID === 'undefined'
    ) {
      return `Cannot perform booking because missing parameter bookingID. Ask the customer to provide bookingID to perform booking\n`;
    }

    const { bookingID } = toolInput;
    try {
      const response = await this.run(bookingID);
      if (response.success) {
        return `Room reservation with ID: ${bookingID} is cancelled successfully\n`;
      } else {
        return `Room reservation with ID: ${bookingID} is not cancelled successfully. Error message: ${response.error}\n`;
      }
    } catch (error: any) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Run the cancel reservation service.
   * @param bookingID
   * @returns
   */
  async run(
    bookingID: string,
  ): Promise<{ success: boolean; error: string | null | undefined }> {
    const header = {
      Authorization: `Bearer ${this.accessToken}`,
    };
    const HTTP_UNAUTHORIZED = 403;
    let response: AxiosResponse<LibcalAPICancelReservationResponse> | undefined;
    while (response === undefined || response.status === HTTP_UNAUTHORIZED) {
      try {
        response =
          await this.httpService.axiosRef.post<LibcalAPICancelReservationResponse>(
            `${this.CANCEL_URL}/${bookingID}`,
            {},
            { headers: header },
          );
      } catch (error: any) {
        if (error.response.status === HTTP_UNAUTHORIZED) {
          this.libcalAuthorizationService.resetToken();
          continue;
        } else {
          this.logger.error(error);
          throw error;
        }
      }
    }
    if (response.data[0].cancelled) {
      return { success: true, error: null };
    } else {
      return { success: false, error: response.data[0].error };
    }
  }

  onModuleDestroy() {
    this.tokenSubscription.unsubscribe();
  }
}

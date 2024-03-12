import { Injectable } from '@nestjs/common';
import { NetworkService } from 'src/shared/services/network/network.service';
import { Room, LibcalApiAuthorizationService } from '../libcal-api-auth/libcal-api-auth.service';

@Injectable()
export class CancelReservationService {

  public readonly name: string = "CancelReservationService";
  public readonly description: string =
    "This tool is for cancelling study room reservation. Use Final Answer instead if you don't have enough required parameters yet. Don't include any single quotes in the paramter.";

  public readonly parameters: { [parameterName: string]: string } = {
    bookingID: "string [REQUIRED]"
  };

  /**
   * Singleton instance of the CancelReservationService.
   */
  constructor(
    private networkService: NetworkService,
    private libcalApiAuthService: LibcalApiAuthorizationService
  ) {}

  /**
   * Run the cancel reservation service.
   * @param toolInput 
   * @returns
   */
  async serviceRun(toolInput: { bookingID: string | null }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (
        toolInput.bookingID === null ||
        toolInput.bookingID === "null" ||
        toolInput.bookingID === undefined ||
        toolInput.bookingID === "undefined"
      ) {
        console.log(
          `Cannot perform booking because missing parameter bookingID. Ask the customer to provide bookingID to perform booking\n`
        );
        resolve(
          `Cannot perform booking because missing parameter bookingID. Ask the customer to provide bookingID to perform booking\n`
        );

        return;
      }

      const { bookingID } = toolInput;
      try {
        const response = await this.run(bookingID);
        if (response.success) {
          resolve(
            `Room reservation with ID: ${bookingID} is cancelled successfully\n`
          );
        } else {
          resolve(
            `Room reservation with ID: ${bookingID} is cancelled unsuccessfully. Error message: ${response.error}\n`
          );
        }
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Run the cancel reservation service.
   * @param bookingID 
   * @returns a promise that resolves with the result of the successful function execution.
   */
  async run(
    bookingID: string
  ): Promise<{ success: boolean; error: string | null }> {
    return new Promise<{ success: boolean; error: string | null }>(
      async (resolve, reject) => {
        const accessToken = await this.libcalApiAuthService.getAccessToken();
        const header = {
          Authorization: `Bearer ${accessToken}`
        };
      }
    );
  }
}

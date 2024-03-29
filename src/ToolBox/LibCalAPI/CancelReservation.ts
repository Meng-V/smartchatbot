import { LibCalAPIBaseTool } from "./LibCalAPI";
import { ToolInput } from "../ToolTemplates";
import axios, { AxiosError, AxiosResponse } from "axios";
import { retryWithMaxAttempts } from "../../Utils/NetworkUtils";

class CancelReservationTool extends LibCalAPIBaseTool {
  private static instance: CancelReservationTool;

  public readonly name: string = "CancelReservationTool";
  public readonly description: string =
    "This tool is for cancelling study room reservation.Use Final Answer instead if you don't have enough required parameters yet.Don't include any single quotes in the paramter.";

  public readonly parameters: { [parameterName: string]: string } = {
    bookingID: "string [REQUIRED]",
  };

  constructor() {
    super();
    CancelReservationTool.instance = this;
  }

  public static getInstance(): CancelReservationTool {
    if (!CancelReservationTool.instance) {
      CancelReservationTool.instance = new CancelReservationTool();
    }
    return CancelReservationTool.instance;
  }

  async toolRun(toolInput: { bookingID: string | null }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (
        toolInput.bookingID === null ||
        toolInput.bookingID === "null" ||
        toolInput.bookingID === undefined ||
        toolInput.bookingID === "undefined"
      ) {
        console.log(
          `Cannot perform booking because missing parameter bookingID.Ask the customer to provide bookingID to perform booking\n`
        );
        resolve(
          `Cannot perform booking because missing parameter bookingID.Ask the customer to provide bookingID to perform booking\n`
        );

        return;
      }

      const { bookingID } = toolInput;
      try {
        const response = await CancelReservationTool.run(bookingID);
        if (response.success) {
          resolve(
            `Room reservation with ID: ${bookingID} is cancelled successfully\n`
          );
        } else {
          resolve(
            `Room reservation with ID: ${bookingID} is cancelled unsuccessfully.Error message: ${response.error}\n`
          );
        }
      } catch (error: any) {
        reject(error);
      }
    });
  }

  static async run(
    bookingID: string
  ): Promise<{ success: boolean; error: string | null }> {
    return new Promise<{ success: boolean; error: string | null }>(
      async (resolve, reject) => {
        // const timeout = setTimeout(() => {
        //   reject("Request Time Out");
        // }, 5000);

        const instance = CancelReservationTool.getInstance();
        const accessToken: string = await instance.getAccessToken();
        const header = {
          Authorization: `Bearer ${accessToken}`,
        };

        // console.log("Payload", payload);

        try {
          let response;
          response = await retryWithMaxAttempts<AxiosResponse<any, any>>(
            (): Promise<AxiosResponse<any, any>> => {
              return new Promise<AxiosResponse<any, any>>((resolve, reject) => {
                try {
                  const axiosResponse = axios({
                    method: "post",
                    headers: header,
                    url: `${instance.CANCEL_URL}/${bookingID}`,
                  });
                  resolve(axiosResponse);
                } catch (error: any) {
                  reject(error);
                }
              });
            }
          );

          if (response.data[0].cancelled) {
            resolve({
              success: true,
              error: null,
            });
          } else {
            resolve({
              success: false,
              error: response.data[0].error,
            });
          }
        } catch (error: any) {
          reject(error);
        }
      }
    );
  }
}

export { CancelReservationTool };

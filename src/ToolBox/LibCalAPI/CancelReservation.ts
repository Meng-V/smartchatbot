import { LibCalAPIBaseTool } from "./LibCalAPI";
import { ToolInput } from "../ToolTemplates";
import axios, { AxiosError, AxiosResponse } from "axios";

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

  async toolRun(toolInput: { bookingID: string }): Promise<string> {
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

      const response = await CancelReservationTool.run(bookingID);
      if (response.success) {
        resolve(
          `Room reservation with ID: ${bookingID} is cancelled successfully\n`,
        );
      } else {
        resolve(
          `Room reservation with ID: ${bookingID} is cancelled unsuccessfully.Error message: ${response.error}\n`
        );
      }
    });
  }

  static async run(
    bookingID: string,
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
          let response = await axios({
            method: "post",
            headers: header,
            url: `${instance.CANCEL_URL}/${bookingID}`,
          });
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
          console.log(error.message);
          resolve({
            success: false,
            error: "Sorry there was an error with the reservation, " + error.message,
          })
        }
      },
    );
  }
}

export { CancelReservationTool };

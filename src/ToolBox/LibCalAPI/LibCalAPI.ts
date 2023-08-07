import axios, { AxiosError, AxiosResponse } from "axios";
import { Tool, ToolInput } from "../ToolTemplates";
import "dotenv/config";
import { AxiosRetries } from "../../Utils/NetworkUtils";

abstract class LibCalAPIBaseTool implements Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: { [parameterName: string]: string };

  protected readonly OAUTH_URL = process.env["LIBCAL_OAUTH_URL"]!;
  protected readonly CLIENT_ID = process.env["LIBCAL_CLIENT_ID"]!;
  protected readonly CLIENT_SECRET = process.env["LIBCAL_CLIENT_SECRET"]!;
  protected readonly GRANT_TYPE = process.env["LIBCAL_GRANT_TYPE"]!;
  protected readonly ROOM_INFO_URL = process.env["LIBCAL_ROOM_INFO_URL"];
  protected readonly AVAILABLE_URL = process.env["LIBCAL_AVAILABLE_URL"]!;
  protected readonly RESERVATION_URL = process.env["LIBCAL_RESERVATION_URL"]!;
  protected readonly CANCEL_URL = process.env["LIBCAL_CANCEL_URL"]!;
  protected readonly HOUR_URL = process.env["LIBCAL_HOUR_URL"]!;
  protected readonly BUILDING_ID = process.env["TEST_BUILDING"];

  protected static timezone = (() => {
    const diff = new Date().getTimezoneOffset() / 60;
    return diff < 0 ? `${diff}`.slice(1) : `${diff}`;
  })();

  protected constructor() {}

  protected async getAccessToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
      //        reject("Request Time Out");
      //      }, 5000);
      let response: AxiosResponse<any, any>;
      try {
        response = await AxiosRetries((): Promise<AxiosResponse<any, any>> => {
          return new Promise<AxiosResponse<any, any>>((resolve, reject) => {
            try {
              const axiosResponse = axios({
                method: "post",
                url: this.OAUTH_URL,
                data: { grant_type: this.GRANT_TYPE },
                auth: {
                  username: this.CLIENT_ID,
                  password: this.CLIENT_SECRET,
                },
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
      // console.log(this.OAUTH_URL);
      // resolve("yay")
    });
  }

  abstract toolRun(input: ToolInput): Promise<string>;
}

export { LibCalAPIBaseTool };

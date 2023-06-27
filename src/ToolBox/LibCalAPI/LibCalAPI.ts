import axios, { AxiosError, AxiosResponse } from "axios";
import { Tool, ToolInput } from "../ToolTemplates";
import "dotenv/config";



abstract class LibCalAPIBaseTool implements Tool {

  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: { [parameterName: string]: string; };

  protected readonly oauth_url = process.env["OAUTH_URL"]!;
  protected readonly client_id = process.env["CLIENT_ID"]!;
  protected readonly client_secret = process.env["CLIENT_SECRET"]!;
  protected readonly grant_type = process.env["GRANT_TYPE"]!;
  protected readonly available_url = process.env["AVAILABLE_URL"]!;
  protected readonly reservation_url = process.env["RESERVATION_URL"]!;
  protected readonly cancel_url = process.env["CANCEL_URL"]!;

  protected constructor() {
  }

  protected async getAccessToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
      //        reject("Request Time Out");
      //      }, 5000);
      const response = await axios({
        method: "post",
        url: this.oauth_url,
        data: { grant_type: this.grant_type },
        auth: {
          username: this.client_id,
          password: this.client_secret,
        },
      });

      resolve(response.data.access_token!);
      // console.log(this.oauth_url);
      // resolve("yay")
    });
  }

  abstract run(input: ToolInput): Promise<string>;
}

export { LibCalAPIBaseTool };

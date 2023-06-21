import axios from "axios";
import { Tool } from "./ToolTemplates";
import "dotenv/config";
import { auth } from "@googleapis/customsearch";

class LibCalAPI implements Tool {
  private static instance: LibCalAPI;

  public name: string = "StudyRoomReservation";
  public description: string =
    "This tool is for study room reservation. It needs information about start time, end time, firstname, lastname, email, roomID";

  public readonly parameters: { [parameterName: string]: string } = {
    firstName: "string",
    lastName: "string",
    email: "string",
    startTime: "string <range from 00:00 to 23:59>",
    endTime: "string <range from 00:00 to 23:59>",
    roomID: "string",
  };

  private readonly oauth_url = process.env["OAUTH_URL"]!;
  private readonly client_id = process.env["CLIENT_ID"]!;
  private readonly client_secret = process.env["CLIENT_SECRET"]!;
  private readonly grant_type = process.env["GRANT_TYPE"]!;
  private readonly available_url = process.env["AVAILABLE_URL"]!;
  private readonly reservation_url = process.env["RESERVATION_URL"]!;
  private readonly cancel_url = process.env["CANCEL_URL"]!;

  private constructor() {
    LibCalAPI.instance = this;
  }

  private async getAccessToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("Request Time Out");
      }, 5000);
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
    });
  }

  async run(
    firstName: string,
    lastName: string,
    email: string,
    startTime: string,
    endTime: string,
    roomID: string
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("Request Time Out");
      }, 5000);

      const accessToken: string = await this.getAccessToken();
      const header = {
        "Authorization": `Bearer ${accessToken}`
      }
      const response = await axios({
        method: "post",
        headers: header,
        url: this.reservation_url,
      });

      resolve(JSON.stringify(response.data))
    });
  }
}

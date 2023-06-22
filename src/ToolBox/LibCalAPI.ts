import axios from "axios";
import { Tool } from "./ToolTemplates";
import "dotenv/config";
import { auth } from "@googleapis/customsearch";

class LibCalAPI implements Tool {
  private static instance: LibCalAPI;

  public name: string = "StudyRoomReservation";
  public description: string =
    "This tool is for study room reservation. This tool has 8 parameters. Don't include any quotes or double quotes in the paramter";

  public readonly parameters: { [parameterName: string]: string } = {
    firstName: "string",
    lastName: "string",
    email: "string",
    startDate: "string [format YYYY-MM-DD]",
    startTime: "string [format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
    endDate: "string [format YYYY-MM-DD]",
    endTime: "string [format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
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

  async run(
    firstName: string,
    lastName: string,
    email: string,
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string,
    roomID: string
  ): Promise<string> {
    return new Promise<string>(async(resolve, reject) => {
      const response = await LibCalAPI.run(firstName, lastName, email, startDate, startTime, endDate, endTime, roomID);
      resolve(response)
    })
  }

  public static getInstance(): LibCalAPI {
    if (!LibCalAPI.instance) {
      LibCalAPI.instance = new LibCalAPI();
    }
    return LibCalAPI.instance;
  }

  static async run(
    firstName: string,
    lastName: string,
    email: string,
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string,
    roomID: string
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject("Request Time Out");
      // }, 5000);

      const instance = LibCalAPI.getInstance();
      const accessToken: string = await instance.getAccessToken();
      const header = {
        "Authorization": `Bearer ${accessToken}`
      }

      const payload = {
        "start": `${startDate}T${startTime}-05:00`,
        "fname": firstName,
        "lname": lastName,
        "email": email,
        "bookings": [
            {
                "id": roomID,
                "to": `${endDate}T${endTime}-05:00`
            },
        ]
    }
      
      const response = await axios({
        method: "post",
        headers: header,
        url: instance.reservation_url,
        data: payload
      });
      console.log(instance.reservation_url);

      resolve(`Study Room is booked successfully. Please tell the customer this booking confirmation information: ${JSON.stringify(response.data)}`)
      // resolve("Yay");
    });
  }
}

export {LibCalAPI};

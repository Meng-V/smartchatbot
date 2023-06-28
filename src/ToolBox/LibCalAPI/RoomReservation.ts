import { LibCalAPIBaseTool } from "./LibCalAPI";
import { ToolInput } from "../ToolTemplates";
import axios, { AxiosError, AxiosResponse } from "axios";

class RoomReservationTool extends LibCalAPIBaseTool {
  private static instance: RoomReservationTool;

  public readonly name: string = "StudyRoomReservationTool";
  public readonly description: string =
    "This tool is for study room reservation. This tool has 8 parameters. Please use Final Answer instead if you don't have enough parameters yet. Don't include any single quotes in the paramter.";

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

  constructor() {
    super();
    RoomReservationTool.instance = this;
  }

  public static getInstance(): RoomReservationTool {
    if (!RoomReservationTool.instance) {
      RoomReservationTool.instance = new RoomReservationTool();
    }
    return RoomReservationTool.instance;
  }

  async run(toolInput: ToolInput): Promise<string> {
    const {
      firstName,
      lastName,
      email,
      startDate,
      startTime,
      endDate,
      endTime,
      roomID,
    } = toolInput;
    return new Promise<string>(async (resolve, reject) => {
      const response = await RoomReservationTool.run(
        firstName,
        lastName,
        email,
        startDate,
        startTime,
        endDate,
        endTime,
        roomID
      );
      resolve(response);
    });
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

      const instance = RoomReservationTool.getInstance();
      const accessToken: string = await instance.getAccessToken();
      const header = {
        Authorization: `Bearer ${accessToken}`,
      };

      const payload = {
        start: `${startDate}T${startTime}-0${RoomReservationTool.timezone}:00`,
        fname: firstName,
        lname: lastName,
        email: email,
        bookings: [
          {
            id: roomID,
            to: `${endDate}T${endTime}-0${RoomReservationTool.timezone}:00`,
          },
        ],
      };

      // console.log("Payload", payload);
      try {
        console.log(payload);
        let response = await axios({
          method: "post",
          headers: header,
          url: instance.reservation_url,
          data: payload,
        });
        resolve(
          `Room ${roomID} is booked successfully from ${startTime} to ${endTime} on ${startDate}. Confirmation email should be sent to customer's email. Please tell the customer that the reservation is successful and this booking number information: ${JSON.stringify(
            response.data
          )}`
        );
      } catch (error: any) {
        if (error.response) {
          const errorData = error.response.data as string;
          console.log(error);
          if (errorData.includes("not a valid starting slot")) {
            resolve(
              "Room reservation is unsuccessful. Time slot is not available for your room"
            );
          }
        } else {
          console.log(error.message);
        }
      }
      // console.log(instance.reservation_url);
    });
  }
}

export {RoomReservationTool};
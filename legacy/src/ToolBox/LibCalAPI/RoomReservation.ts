import prisma from "../../../prisma/prisma";
import { CheckRoomAvailabilityTool } from "./CheckRoomAvailability";
import { LibCalAPIBaseTool, Room } from "./LibCalAPI";
import axios, { AxiosResponse } from "axios";
import { retryWithMaxAttempts } from "../../Utils/NetworkUtils";
import { Utils } from "./Utils";

class RoomReservationTool extends LibCalAPIBaseTool {
  private static instance: RoomReservationTool;

  public readonly name: string = "StudyRoomReservationTool";
  public readonly description: string =
    "This tool is for study room reservation.No need to use tool CheckRoomAvailabilityTool before using this tool.Use Final Answer instead if you don't have enough required parameters yet.Don't include any single quotes in the paramter.Disclaimer: This tool assumes startDate is as same as endDate";

  public readonly parameters: { [parameterName: string]: string } = {
    firstName: "string[REQUIRED]",
    lastName: "string[REQUIRED]",
    email:
      "string[REQUIRED][@miamioh.edu email][Always ask for email.Never predict.]",
    startDate: "string[REQUIRED][format YYYY-MM-DD]",
    startTime:
      "string[REQUIRED][format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
    endDate: "string[REQUIRED][format YYYY-MM-DD]",
    endTime:
      "string[REQUIRED][format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
    roomCapacity:
      "string|null[OPTIONAL][capacity(number of people)of the room you wish to reserve.]",
    roomCodeName: "string|null[OPTIONAL][such as: 145, 211, 297A, 108C, etc.]",
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

  /**
   * Select an available room from the input room IDs list based on the requested time. This assumes startDate is as same as endDate
   * @param roomIDs
   * @param startDate
   * @param startTime
   * @param endDate
   * @param endTime
   * @returns Promise<string>: Promise of the satisfying room ID. Reject if no room satisfies
   */
  private async selectAvailableRoom(
    rooms: Room[],
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
  ): Promise<Room> {
    return new Promise<Room>(async (resolve, reject) => {
      const checkRoomAvailabilityInstance =
        CheckRoomAvailabilityTool.getInstance();
      try {
        for (let room of rooms) {
          if (
            await checkRoomAvailabilityInstance.isAvailable(
              room.roomID,
              startDate,
              startTime,
              endDate,
              endTime
            )
          ) {
            resolve(room);
            return;
          }
        }
      } catch (error: any) {
        reject(error);
      }
      reject("No room satisfies");
    });
  }

  async toolRun(toolInput: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    startDate: string | null;
    startTime: string | null;
    endDate: string | null;
    endTime: string | null;
    roomCapacity: string | null;
    roomCodeName: string | null;
  }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      let nullFields = [];
      for (const param of Object.keys(
        toolInput
      ) as (keyof typeof toolInput)[]) {
        if (param === "roomCapacity" || param === "roomCodeName") continue;
        if (
          toolInput[param] === null ||
          toolInput[param] === "null" ||
          toolInput[param] === undefined ||
          toolInput[param] === "undefined"
        ) {
          nullFields.push(param);
        }
      }
      if (nullFields.length > 0) {
        console.log(
          `Cannot perform booking because missing parameter ${JSON.stringify(
            nullFields
          )}.Ask the customer to provide ${JSON.stringify(
            nullFields
          )} to perform booking.`
        );
        resolve(
          `Cannot perform booking because missing parameter ${JSON.stringify(
            nullFields
          )}.Ask the customer to provide ${JSON.stringify(
            nullFields
          )} to perform booking.`
        );
        return;
      }

      const {
        firstName,
        lastName,
        email,
        startDate,
        startTime,
        endDate,
        endTime,
        roomCapacity,
        roomCodeName,
      } = toolInput;

      //Validate miamioh.edu email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@miamioh\.edu$/;
      if (!emailRegex.test(email!)) {
        resolve("Email has to have @miamioh.edu domain");
        return;
      }

      const instance = RoomReservationTool.getInstance();
      await instance.updateRoomInfoDatabase();

      try {
        const response = await RoomReservationTool.run(
          firstName!,
          lastName!,
          email!,
          startDate!,
          startTime!,
          endDate!,
          endTime!,
          roomCapacity,
          roomCodeName
        );
        resolve(response);
      } catch (error: any) {
        reject(error);
      }
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
    roomCapacity: string | null,
    roomCodeName: string | null
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   reject("Request Time Out");
      // }, 5000);
      const instance = RoomReservationTool.getInstance();

      let availableRoom: Room | null = null;
      if (
        (!roomCapacity ||
          roomCapacity === "null" ||
          roomCapacity === "undefined") &&
        (!roomCodeName ||
          roomCodeName === "null" ||
          roomCodeName === "undefined")
      ) {
        resolve(
          "Room capacity and room code name are both empty.Ask customer to specify one of them."
        );
        return;
      } else if (
        !roomCapacity ||
        roomCapacity === "null" ||
        roomCapacity === "undefined"
      ) {
        try {
          availableRoom = await Utils.getRoomByCodeName(roomCodeName as string);
          if (!availableRoom) {
            resolve("No such room with the input code name.");
            return;
          }
        } catch (error: any) {
          reject(error);
          return;
        }
      } else {
        const potentialCapacityList =
          await Utils.matchNumberOfPeopleToPotentialCapacity(
            parseInt(roomCapacity, 10)
          );
        if (potentialCapacityList.length === 0) {
          resolve(`We do not have any room that fit ${roomCapacity}.`);
          return;
        }

        for (let capacity of potentialCapacityList) {
          const rooms = await Utils.getRoomByCapacity(capacity);

          try {
            availableRoom = await instance.selectAvailableRoom(
              rooms,
              startDate,
              startTime,
              endDate,
              endTime
            );
            break;
          } catch (error: any) {
            continue;
          }
        }
      }
      if (availableRoom === null) {
        resolve("No room is available for the input condition");
        return;
      }

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
            id: availableRoom.roomID,
            to: `${endDate}T${endTime}-0${RoomReservationTool.timezone}:00`,
          },
        ],
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
                  url: instance.RESERVATION_URL,
                  data: payload,
                });
                resolve(axiosResponse);
              } catch (error: any) {
                reject(error);
              }
            });
          },
          5
        );

        resolve(
          `Room ${availableRoom.roomName} with capacity ${
            availableRoom.capacity
          } is booked successfully from ${startTime} to ${endTime} on ${startDate}.Confirmation email should be sent to customer's email.Tell the customer that the reservation is successful and this booking number information:${JSON.stringify(
            response.data,
            ["booking_id"]
          )}`
        );
      } catch (error: any) {
        if (error.response) {
          const errorData = error.response.data as string;
          if (errorData.includes("not a valid starting slot")) {
            resolve(
              "Room reservation is unsuccessful.Time slot is not available for your room"
            );
          }
        } else {
          reject(error);
        }
      }
      // console.log(instance.RESERVATION_URL);
    });
  }
}

export { RoomReservationTool };

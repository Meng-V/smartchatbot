import prisma from "../../../prisma/prisma";
import { LibrarianSubjectSearchTool } from "../LibrarianSubject";
import { CheckRoomAvailabilityTool } from "./CheckRoomAvailability";
import { LibCalAPIBaseTool } from "./LibCalAPI";
import axios from "axios";
import { match } from "assert";

type Room = { roomID: string; roomName: string; capacity: number };

class RoomReservationTool extends LibCalAPIBaseTool {
  private static instance: RoomReservationTool;

  public readonly name: string = "StudyRoomReservationTool";
  public readonly description: string =
    "This tool is for study room reservation. No need to use tool CheckRoomAvailabilityTool before using this tool. Use Final Answer instead if you don't have enough required parameters yet. Don't include any single quotes in the paramter. Disclaimer: This tool assumes startDate is as same as endDate";

  public readonly parameters: { [parameterName: string]: string } = {
    firstName: "string [REQUIRED]",
    lastName: "string [REQUIRED]",
    email: "string [REQUIRED]",
    startDate: "string [REQUIRED] [format YYYY-MM-DD]",
    startTime:
      "string [REQUIRED] [format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
    endDate: "string [REQUIRED] [format YYYY-MM-DD]",
    endTime:
      "string [REQUIRED] [format HH-MM-SS ranging from 00:00:00 to 23:59:59]",
    roomCapacity:
      "string | null [OPTIONAL] [capacity (number of people) of the room you wish to reserve.]",
    roomCodeName:
      "string | null [OPTIONAL] [such as: 145, 211, 297A, 108C, etc.]",
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

  private async fetchRoomData(): Promise<any[]> {
    return new Promise<any[]>(async (resolve, reject) => {
      const instance = RoomReservationTool.instance;
      const header = {
        Authorization: `Bearer ${await instance.getAccessToken()}`,
      };
      const response = await axios({
        method: "get",
        headers: header,
        url: `${instance.ROOM_INFO_URL}/${instance.BUILDING_ID}`,
      });
      resolve(response.data);
    });
  }

  /**
   * Update database of Room if it's too outdated
   * @param updateDuration if the most recent update is older than this threshold (days). New data would be updated into database
   * @returns True if it performs update, False otherwise
   */
  private async updateRoomInfoDatabase(
    updateDuration: number
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const savedRoomInfo = await prisma.room.findMany();
      let didUpdate = false;
      if (
        !savedRoomInfo ||
        savedRoomInfo.length === 0 ||
        new Date().valueOf() - savedRoomInfo[0].lastUpdated.valueOf() >
          updateDuration * 1000 * 60 * 60 * 24
      ) {
        didUpdate = true;
        const rooms = await this.fetchRoomData();
        for (let room of rooms) {
          const roomNameRegex = /(\d+)([A-Za-z])?/;
          const roomNameMatch = room.name.match(roomNameRegex);
          let codeName: string;
          if (!roomNameMatch) {
            console.log("Room name does not match pattern");
            codeName = room.name;
          } else {
            codeName = `${roomNameMatch[1]}${
              roomNameMatch[2] ? roomNameMatch[2] : ""
            }`;
          }

          await prisma.room.upsert({
            where: {
              id: `${room.id}`,
            },
            update: {},
            create: {
              id: `${room.id}`,
              codeName: codeName,
              capacity: room.capacity,
              type: "study room",
              isAccessible: room.isAccessible,
            },
          });
        }
      }
      resolve(didUpdate);
    });
  }

  private async getRoomByCapacity(capacity: number): Promise<Room[]> {
    return new Promise<Room[]>(async (resolve, reject) => {
      const rooms = await prisma.room.findMany({
        where: {
          capacity: capacity,
        },
      });

      const returnRoomObjs = rooms.map((room) => {
        return {
          roomID: room.id,
          roomName: room.codeName,
          capacity: room.capacity,
        };
      });
      resolve(returnRoomObjs);
    });
  }

  /**
   * Match the number of people to the closest available capacity
   * @param peopleNum
   * @returns number[]. Array of available capacity in the database, sorted by how close from it to the number of people. For example, we have these capacity: [2, 4, 8, 12, 20], and 6 people; this function would return [8, 12, 20]
   */
  private async matchNumberOfPeopleToPotentialCapacity(
    peopleNum: number
  ): Promise<number[]> {
    return new Promise<number[]>(async (resolve, reject) => {
      const capacityList = (
        await prisma.room.findMany({
          distinct: ["capacity"],
          select: {
            capacity: true,
          },
        })
      )
        .map((room) => room.capacity)
        .filter((capacity) => capacity >= peopleNum);
      resolve(capacityList);
    });
  }

  private async getRoomByCodeName(roomCodeName: string): Promise<Room> {
    return new Promise<Room>(async (resolve, reject) => {
      console.log(roomCodeName)
      const rooms: { id: string; codeName: string; capacity: number }[] =
        await prisma.$queryRaw`SELECT id, "codeName", capacity FROM "Room" WHERE "codeName" LIKE ${`%${roomCodeName}%`}`;
      if (!rooms) {
        reject("Cannot find any room with input name");
        return;
      }
      const returnedRoom = {
        roomID: rooms[0].id,
        roomName: rooms[0].codeName,
        capacity: rooms[0].capacity,
      };
      resolve(returnedRoom);
    });
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
      reject("No room satisfies");
    });
  }

  async toolRun(toolInput: {
    [key: string]: string | null;
    firstName: string;
    lastName: string;
    email: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    roomCapacity: string | null;
    roomCodeName: string | null;
  }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      for (const param of Object.keys(toolInput)) {
        if (param === "roomCapacity" || param === "roomCodeName") continue;
        if (toolInput[param] === null || toolInput[param] === "null" || toolInput[param] === undefined || toolInput[param] === "undefined") {
          console.log(
            `Cannot perform booking because missing parameter ${param}. Please ask the customer to provide ${param} to perform booking`
          );
          resolve(
            `Cannot perform booking because missing parameter ${param}. Please ask the customer to provide ${param} to perform booking`
          );

          return;
        }
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

      try {
        const response = await RoomReservationTool.run(
          firstName,
          lastName,
          email,
          startDate,
          startTime,
          endDate,
          endTime,
          roomCapacity,
          roomCodeName
        );
        resolve(response);
      } catch (e: any) {
        resolve(`Tell the customer this error: ${e.error}`);
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
      await instance.updateRoomInfoDatabase(60);
      let availableRoom: Room | null = null;
      if (
        (!roomCapacity || roomCapacity === "null") &&
        (!roomCodeName || roomCodeName === "null")
      ) {
        reject({
          error:
            "Room capacity and room code name are both empty. Please ask customer to specify one of them.",
        });
        return;
      } else if (!roomCapacity || roomCapacity === "null") {
        availableRoom = await instance.getRoomByCodeName(
          roomCodeName as string
        );
      } else {
        const potentialCapacityList =
          await instance.matchNumberOfPeopleToPotentialCapacity(
            parseInt(roomCapacity, 10)
          );
        if (potentialCapacityList.length === 0) {
          reject({
            error: `We do not have any room that fit ${roomCapacity}.`
          })
        }

        for (let capacity of potentialCapacityList) {
          const rooms = await instance.getRoomByCapacity(capacity);

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
        reject({ error: "No room is available for the input condition" });
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
        console.log(payload);
        let response = await axios({
          method: "post",
          headers: header,
          url: instance.RESERVATION_URL,
          data: payload,
        });
        resolve(
          `Room ${availableRoom.roomName} with capacity ${
            availableRoom.capacity
          } is booked successfully from ${startTime} to ${endTime} on ${startDate}. Confirmation email should be sent to customer's email. Please tell the customer that the reservation is successful and this booking number information: ${JSON.stringify(
            response.data,
            ["booking_id"]
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
      // console.log(instance.RESERVATION_URL);
    });
  }
}

export { RoomReservationTool };

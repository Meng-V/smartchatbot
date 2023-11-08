import { LibCalAPIBaseTool, Room } from "./LibCalAPI";
import axios, { AxiosResponse } from "axios";
import { retryWithMaxAttempts } from "../../Utils/NetworkUtils";
import { Utils } from "./Utils";

type Timestamp = {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  timezone: string;
};
type SimpleTimestamp = {
  hour: number;
  minute: number;
  second: number;
};

class CheckRoomAvailabilityTool extends LibCalAPIBaseTool {
  private static instance: CheckRoomAvailabilityTool;

  public readonly name: string = "CheckRoomAvailabilityTool";
  public readonly description: string =
    "This tool is for checking the available hours of a study room on one specific date.Use Final Answer instead if you don't have enough required parameters(roomID and date)yet.Don't include any single quotes in the paramter.The year is implicitly the current year";

  public readonly parameters: { [parameterName: string]: string } = {
    date: "string [REQUIRED][format YYYY-MM-DD]",
    roomCapacity:
      "string|null[OPTIONAL][capacity(number of people)of the room you wish to reserve.]",
    roomCodeName: "string|null[OPTIONAL][such as: 145, 211, 297A, 108C, etc.]",
  };

  constructor() {
    super();
    CheckRoomAvailabilityTool.instance = this;
  }

  public static getInstance(): CheckRoomAvailabilityTool {
    if (!CheckRoomAvailabilityTool.instance) {
      CheckRoomAvailabilityTool.instance = new CheckRoomAvailabilityTool();
    }
    return CheckRoomAvailabilityTool.instance;
  }
  /**
   * Used for parsing Lib Cal Time stamp in this format <YYYY-MM-DD>T<HH:MM:SS>-04:00
   */
  private parseTimestamp(timestampString: string): Timestamp {
    const regex =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([A-Za-z0-9:\-]+)$/;

    const matches = timestampString.match(regex);

    if (matches) {
      let [_, year, month, date, hour, minute, second, timezone] = matches;
      return {
        year: parseInt(year),
        month: parseInt(month),
        date: parseInt(date),
        hour: parseInt(hour),
        minute: parseInt(minute),
        second: parseInt(second),
        timezone: timezone,
      };
    } else {
      throw Error("Cannot parse timestamp");
    }
  }

  private timestampStringtify(
    timestamp: Timestamp,
    verbose: boolean = false,
    timezone: boolean = false
  ): string {
    if (verbose) {
      const timezoneStr = timezone ? `with timezone ${timestamp.timezone}` : "";
      return `Date ${timestamp.year
        .toString()
        .padStart(2, "0")}-${timestamp.month
        .toString()
        .padStart(2, "0")}-${timestamp.date
        .toString()
        .padStart(2, "0")} at ${timestamp.hour
        .toString()
        .padStart(2, "0")}:${timestamp.minute
        .toString()
        .padStart(2, "0")}:${timestamp.second
        .toString()
        .padStart(2, "0")} ${timezoneStr}`;
    } else {
      return `${timestamp.year.toString().padStart(2, "0")}-${timestamp.month
        .toString()
        .padStart(2, "0")}-${timestamp.date
        .toString()
        .padStart(2, "0")}T${timestamp.hour
        .toString()
        .padStart(2, "0")}:${timestamp.minute
        .toString()
        .padStart(2, "0")}:${timestamp.second.toString().padStart(2, "0")}${
        timezone ? timestamp.timezone : ""
      }`;
    }
  }

  /**
   * Use for merging all the overlapping timestamp. All the input timestamp must be in the same date
   * @param hours
   */
  private mergeHours(
    hours: { from: Timestamp; to: Timestamp }[]
  ): { from: Timestamp; to: Timestamp }[] {
    const intervals: [number, number][] = hours.map((time_block, idx) => {
      return [
        time_block.from.hour * 60 + time_block.from.minute,
        time_block.to.hour * 60 + time_block.to.minute,
      ];
    });

    intervals.sort((a, b) => a[0] - b[1]);
    let mergeIntervals: [number, number][] = [];
    for (const [start, end] of intervals) {
      if (
        mergeIntervals.length === 0 ||
        start > mergeIntervals[mergeIntervals.length - 1][1]
      )
        mergeIntervals.push([start, end]);
      else
        mergeIntervals[mergeIntervals.length - 1][1] = Math.max(
          end,
          mergeIntervals[mergeIntervals.length - 1][1]
        );
    }
    const [year, month, date, timezone] =
      hours.length > 0
        ? [
            hours[0].from.year,
            hours[0].from.month,
            hours[0].from.date,
            hours[0].from.timezone,
          ]
        : [0, 0, 0, ""];
    const mergeTimestamp = mergeIntervals.map(([start, end], idx) => {
      return {
        from: {
          year: year,
          month: month,
          date: date,
          hour: Math.floor(start / 60),
          minute: start % 60,
          second: 0,
          timezone: timezone,
        },
        to: {
          year: year,
          month: month,
          date: date,
          hour: Math.floor(end / 60),
          minute: end % 60,
          second: 0,
          timezone: timezone,
        },
      };
    });

    return mergeTimestamp;
  }

  /**
   * Determine if a room is available for the input time. This tool assume startDate is the same as endDate
   * @param roomID
   * @param startDate
   * @param startTime
   * @param endDate
   * @param endTime
   * @returns boolean: True if available, False if not
   */
  async isAvailable(
    roomID: string,
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      //Parse the start and endTime
      const timeRegex = /^(\d{2}):(\d{2}):(\d{2})$/;
      const startMatch = startTime.match(timeRegex);
      const endMatch = endTime.match(timeRegex);

      if (!startMatch || !endMatch) {
        reject("Invalid time format.Expected format: HH:MM:SS");
      }

      const requestStartTime: SimpleTimestamp = {
        hour: parseInt(startMatch![1], 10),
        minute: parseInt(startMatch![2], 10),
        second: parseInt(startMatch![3], 10),
      };
      const requestEndTime: SimpleTimestamp = {
        hour: parseInt(endMatch![1], 10),
        minute: parseInt(endMatch![2], 10),
        second: parseInt(endMatch![3], 10),
      };

      let response;
      try {
        response = await CheckRoomAvailabilityTool.run(roomID, startDate);
        if ("error" in response[0]) {
          reject(response[0]!.error);
        }
      } catch (error: any) {
        reject(error);
        return;
      }

      /**
       * Compare 2 timestamp
       * @param time1
       * @param time2
       * @returns 1 if time1 > time2, -1 if time1 < time2, 0 if time1 = time2
       */
      const compareTime = (
        time1: Timestamp | SimpleTimestamp,
        time2: Timestamp | SimpleTimestamp
      ) => {
        if (time1.hour !== time2.hour) {
          return time1.hour > time2.hour ? 1 : -1;
        }
        if (time1.minute !== time2.minute) {
          return time1.minute > time2.minute ? 1 : -1;
        }
        if (time1.second !== time2.second) {
          return time1.second > time2.second ? 1 : -1;
        }
        return 0;
      };

      for (let timeblock of response as { from: Timestamp; to: Timestamp }[]) {
        if (
          compareTime(timeblock.from, requestStartTime) <= 0 &&
          compareTime(timeblock.to, requestEndTime) >= 0
        ) {
          resolve(true);
          return;
        }
      }

      resolve(false);
    });
  }

  async toolRun(toolInput: {
    date: string | null;
    roomCodeName: string | null;
    roomCapacity: string | null;
  }): Promise<string> {
    const { date, roomCodeName, roomCapacity } = toolInput;

    return new Promise<string>(async (resolve, reject) => {
      if (
        date === null ||
        date === undefined ||
        date === "null" ||
        date === "undefined"
      ) {
        const messageError = `Cannot check room availability because missing parameter date.Ask the customer to provide date to check room availability.`;
        console.log(messageError);
        resolve(messageError);
        return;
      }
      const instance = CheckRoomAvailabilityTool.getInstance();
      instance.updateRoomInfoDatabase();

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
          let availableRoom: Room | null = await Utils.getRoomByCodeName(
            roomCodeName as string
          );
          if (!availableRoom) {
            resolve("No such room with the input code name.");
            return;
          }
          try {
            const response = await CheckRoomAvailabilityTool.run(
              availableRoom.roomID as string,
              date as string
            );
            if ("error" in response[0]) {
              resolve(response[0]!.error);
              return;
            }

            const timeBlocksAsString: string = JSON.stringify(
              response.map((timeBlock) => {
                timeBlock = timeBlock as { from: Timestamp; to: Timestamp };
                return {
                  from: this.timestampStringtify(timeBlock.from, true, false),
                  to: this.timestampStringtify(timeBlock.to, true, false),
                };
              })
            );
            resolve(
              `Room ${availableRoom.roomID}'s available time:${timeBlocksAsString}`
            );
          } catch (error: any) {
            reject(error);
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
          resolve(`No room can fit ${roomCapacity}.`);
          return;
        }

        for (let capacity of potentialCapacityList) {
          const rooms = await Utils.getRoomByCapacity(capacity);
          const roomToAvailability: Map<
            Room,
            { from: Timestamp; to: Timestamp }[]
          > = new Map<Room, { from: Timestamp; to: Timestamp }[]>();
          try {
            for (let room of rooms) {
              const availability = await CheckRoomAvailabilityTool.run(
                room.roomID,
                date
              );
              if (availability.length === 0) continue;
              if ("error" in availability[0]) {
                resolve(availability[0]!.error);
                return;
              }
              roomToAvailability.set(
                room,
                availability as { from: Timestamp; to: Timestamp }[]
              );
            }
            if (roomToAvailability.size === 0) continue;
            //Find the room with most available hours
            const bestRoom = Array.from(roomToAvailability.entries()).reduce(
              (maxRoom, [room, availability]) => {
                const totalHours = availability.reduce(
                  (total, { from, to }) =>
                    total + Math.abs(from.hour - to.hour),
                  0
                );

                if (!maxRoom || totalHours > maxRoom.totalHours) {
                  return { room, totalHours };
                }

                return maxRoom;
              },
              { room: null as Room | null, totalHours: 0 }
            );
            console.log(JSON.stringify(bestRoom));
            const timeBlocksAsString: string = JSON.stringify(
              roomToAvailability.get(bestRoom.room as Room)!.map((timeBlock) => {
                timeBlock = timeBlock as { from: Timestamp; to: Timestamp };
                return {
                  from: this.timestampStringtify(timeBlock.from, true, false),
                  to: this.timestampStringtify(timeBlock.to, true, false),
                };
              })
            );
            resolve(
              `For ${roomCapacity} people,we have room ${
                bestRoom.room?.roomName
              } available at ${timeBlocksAsString}`
            );
            return;
          } catch (error: any) {
            reject(error);
            return;
          }
        }
        resolve(`No room can fit ${roomCapacity}`);
      }
    });
  }

  /**
   * This async function runs the tool as the description
   * @param roomID string
   * @param date Has to follow YYYY-MM-DD format
   * @returns
   */
  static async run(
    roomID: string,
    date: string
  ): Promise<{ from: Timestamp; to: Timestamp }[] | { error: string }[]> {
    return new Promise<
      { from: Timestamp; to: Timestamp }[] | { error: string }[]
    >(async (resolve, reject) => {
      const instance = CheckRoomAvailabilityTool.getInstance();
      const accessToken: string = await instance.getAccessToken();
      const header = {
        Authorization: `Bearer ${accessToken}`,
      };
      let response;
      try {
        response = await retryWithMaxAttempts<AxiosResponse<any, any>>(
          (): Promise<AxiosResponse<any, any>> => {
            return new Promise<AxiosResponse<any, any>>((resolve, reject) => {
              try {
                const axiosResponse = axios({
                  method: "get",
                  headers: header,
                  url: `${instance.AVAILABLE_URL}/${roomID}`,
                  params: {
                    availability: date,
                  },
                });
                resolve(axiosResponse);
              } catch (error: any) {
                reject(error);
              }
            });
          }
        );
        if (
          response.data[0].error ===
            "item belongs to category of incorrect type" ||
          !response.data[0] ||
          !response.data[0].availability
        ) {
          resolve([{ error: "Unexisted room ID" }]);
          return;
        }
      } catch (error: any) {
        reject(error);
        return;
      }
      const hours: { from: string; to: string }[] =
        response.data[0].availability;
      const hoursTimestamp: { from: Timestamp; to: Timestamp }[] = hours.map(
        (timeBlock) => {
          return {
            from: instance.parseTimestamp(timeBlock.from),
            to: instance.parseTimestamp(timeBlock.to),
          };
        }
      );
      const mergedTimeBlock: { from: Timestamp; to: Timestamp }[] =
        instance.mergeHours(hoursTimestamp);

      resolve(
        mergedTimeBlock.map((timeBlock) => {
          return {
            from: timeBlock.from,
            to: timeBlock.to,
          };
        })
      );
      return;
    });
  }
}

export { CheckRoomAvailabilityTool };

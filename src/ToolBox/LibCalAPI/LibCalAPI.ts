import axios, { AxiosError, AxiosResponse } from "axios";
import { Tool, ToolInput } from "../ToolTemplates";
import "dotenv/config";
import { retryWithMaxAttempts } from "../../Utils/NetworkUtils";
import prisma from "../../../prisma/prisma";
type Room = { roomID: string; roomName: string; capacity: number };


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

  private updateDatabaseDuration: number = 1;

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
        response = await retryWithMaxAttempts<AxiosResponse<any, any>>(
          (): Promise<AxiosResponse<any, any>> => {
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
          },
          5
        );
      } catch (error: any) {
        reject(error);
        return;
      }

      resolve(response.data.access_token!);
      // console.log(this.OAUTH_URL);
      // resolve("yay")
    });
  }

  protected async fetchRoomData(): Promise<any[]> {
    return new Promise<any[]>(async (resolve, reject) => {
      const header = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
      };
      try {
        const response = await axios({
          method: "get",
          headers: header,
          url: `${this.ROOM_INFO_URL}/${this.BUILDING_ID}`,
        });
        resolve(response.data);
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Update database of Room if it's too outdated
   * @param updateDuration if the most recent update is older than this threshold (days). New data would be updated into database
   * @returns True if it performs update, False otherwise
   */
  protected async updateRoomInfoDatabase(
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      let savedRoomInfo;
      try {
        savedRoomInfo = await prisma.room.findMany();
      } catch (error) {
        reject(error);
        return;
      }
      let didUpdate = false;
      if (
        !savedRoomInfo ||
        savedRoomInfo.length === 0 ||
        new Date().valueOf() - savedRoomInfo[0].lastUpdated.valueOf() >
          this.updateDatabaseDuration * 1000 * 60 * 60 * 24
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
            },
          });
        }
      }
      resolve(didUpdate);
    });
  }

  abstract toolRun(input: ToolInput): Promise<string>;
}

export { LibCalAPIBaseTool, Room };

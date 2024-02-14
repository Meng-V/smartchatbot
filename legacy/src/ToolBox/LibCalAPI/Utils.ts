import prisma from "../../../prisma/prisma";
import { Room } from "./LibCalAPI";
import { RoomReservationTool } from "./RoomReservation";

class Utils {
  /**
   * Match the number of people to the closest available capacity
   * @param peopleNum
   * @returns number[]. Array of available capacity in the database, sorted by how close from it to the number of people. For example, we have these capacity: [2, 4, 8, 12, 20], and 6 people; this function would return [8, 12, 20]
   */
  static async getRoomByCapacity(capacity: number): Promise<Room[]> {
    return new Promise<Room[]>(async (resolve, reject) => {
      let rooms;
      try {
        rooms = await prisma.room.findMany({
          where: {
            capacity: capacity,
          },
        });
      } catch (error: any) {
        reject(error);
        return;
      }

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
  static async matchNumberOfPeopleToPotentialCapacity(
    peopleNum: number
  ): Promise<number[]> {
    return new Promise<number[]>(async (resolve, reject) => {
      let roomObjs;
      try {
        roomObjs = await prisma.room.findMany({
          distinct: ["capacity"],
          select: {
            capacity: true,
          },
        });
      } catch (error: any) {
        reject(error);
        return;
      }
      const capacityList = roomObjs
        .map((room) => room.capacity)
        .filter((capacity) => capacity >= peopleNum);
      resolve(capacityList);
    });
  }

  static async getRoomByCodeName(roomCodeName: string): Promise<Room | null> {
    return new Promise<Room | null>(async (resolve, reject) => {
      const rooms: { id: string; codeName: string; capacity: number }[] =
        await prisma.$queryRaw`SELECT id, "codeName", capacity FROM "Room" WHERE "codeName" LIKE ${`%${roomCodeName}%`}`;
      if (!rooms) {
        resolve(null);
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
}

export { Utils };



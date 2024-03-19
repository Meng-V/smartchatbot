import { Injectable } from '@nestjs/common';
import { NetworkService } from 'src/shared/services/network/network.service';
import { PrismaService } from 'src/prisma.service';
import { Prisma, Room } from '@prisma/client';

@Injectable()
export class UtilService {
  /**
   * Get the singleton instance of the UtilService.
   * @returns
   * @param networkService
   * @param prisma
   */
  constructor (
    private networkService: NetworkService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get the room by the capacity.
   * @param capacity
   * @returns
   */
  async getRoomByCapacity(capacity: number): Promise<Room[]> {
    return new Promise<Room[]>(async (resolve, reject) => {
      let rooms;
      try {
        rooms = await this.prisma.room.findMany({
          where: {
            capacity: capacity,
          }
        });
      } catch (error: any) {
        reject(error);
        return;
      }

      // Map the room objects to return
      const returnRoomObjs = rooms.map((room) => {
        return {
          id: room.id,
          codeName: room.codeName,
          capacity: room.capacity,
          type: room.type,
          lastUpdated: room.lastUpdated
        };
      });
      resolve(returnRoomObjs);
    });
  }

  /**
   * Match the number of people to the closest available capacity.
   * @param peopleNum
   * @returns
   */
  async matchNumberOfPeopleToPotentialCapacity(peopleNum: number): Promise<number[]> {
    return new Promise<number[]>(async (resolve, reject) => {
      let roomObjs;
      try {
        roomObjs = await this.prisma.room.findMany({
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

  /**
   * Get the room by the code name.
   * @param roomCodeName
   * @returns
   */
  async getRoomByCodeName(roomCodeName: string): Promise<Room | null> {
    return new Promise<Room | null>(async (resolve, reject) => {
      let room;
      try {
        room = await this.prisma.room.findFirst({
          where: {
            codeName: roomCodeName,
          }
        });
      } catch (error: any) {
        reject(error);
        return;
      }
      resolve(room);
    });
  }
}

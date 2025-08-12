import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LlmTool, LlmToolInput } from '../../llm-tool.interface';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { Subscription } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { AxiosResponse } from 'axios';

type Room = {
  id: string;
  roomCodeName: string;
  capacity: number;
};

type RoomAvailability = {
  space: {
    id: string;
    name: string;
    image: string;
    capacity: number;
    zoneId: number;
  };
  category: {
    cid: 6672;
    name: string;
  };
  start: string;
  end: string;
};

type SearchAvailabilityApiResponse = {
  exact_matches: RoomAvailability[];
  other_matches: RoomAvailability[];
};

@Injectable()
export class CheckRoomAvailabilityToolService
  implements LlmTool, OnModuleDestroy
{
  public readonly toolName: string = 'CheckRoomAvailabilityTool';
  public readonly toolDescription: string =
    "This tool is for checking if there is any available room for any room with the input time range and room capacity.Currently,this tool only supports King Library Building;if the customer mentions about any other building,tell them you cannot support them.Use Final Answer instead if you don't have enough required parameters(date,startTime,endTime)yet.Don't include any single quotes in the paramter.The year is implicitly the current year";

  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      date: 'string [REQUIRED][format YYYY-MM-DD]',
      startTime: 'string[REQUIRED][format HH-MM ranging from 00:00 to 23:59]',
      endTime: 'string[REQUIRED][format HH-MM ranging from 00:00 to 23:59]',
      roomCapacity:
        'string[OPTIONAL][capacity(number of people)of the room you wish to reserve.]',
    };

  private SEARCH_AVAILABLE_URL =
    this.retrieveEnvironmentVariablesService.retrieve<string>(
      'LIBCAL_SEARCH_AVAILABLE_URL',
    );
  // The default building is King Library at the moment
  private DEFAULT_BUILDING_ID =
    this.retrieveEnvironmentVariablesService.retrieve<string>('KING_BUILDING');

  private accessToken: string = '';
  private tokenSubscription: Subscription;

  constructor(
    private libcalAuthorizationService: LibcalAuthorizationService,
    private httpService: HttpService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {
    this.tokenSubscription = this.libcalAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token) => (this.accessToken = token));
  }

  /**
   * Get the capacity range based on capacity
   * @param capacity
   * @returns capacityRange
   */
  private getCapacityRange(capacity: number | null): number {
    if (capacity === null || capacity === undefined || capacity <= 4) return 1;
    else if (capacity <= 8) return 2;
    else return 3;
  }

  /**
   * Get the list of rooms available in the input date, time, and capacity
   * @param date
   * @param timeStart
   * @param timeEnd
   * @param capacity
   */
  public async fetchAvailableRooms(
    date: string,
    timeStart: string,
    timeEnd: string,
    capacity: number | null,
  ): Promise<Room[]> {
    const url = `${this.SEARCH_AVAILABLE_URL}/${this.DEFAULT_BUILDING_ID}`;

    // Convert HH-MM format to HH:MM format for LibCal API compatibility
    const timeStartFormatted = timeStart.replace('-', ':');
    const timeEndFormatted = timeEnd.replace('-', ':');

    //Try bigger room if no available rooms for the current capacity
    let availableRooms: RoomAvailability[] = [];
    for (
      let capacityRange = this.getCapacityRange(capacity);
      capacityRange <= 3;
      capacityRange++
    ) {
      const HTTP_UNAUTHORIZED = 401;
      const HTTP_FORBIDDEN = 403;
      let response: AxiosResponse<SearchAvailabilityApiResponse> | undefined;

      let retryCount = 0;
      const MAX_RETRIES = 2;
      while (
        response === undefined ||
        response.status === HTTP_UNAUTHORIZED ||
        response.status === HTTP_FORBIDDEN
      ) {
        try {
          // Get fresh token (will refresh if needed)
          const currentToken =
            await this.libcalAuthorizationService.getCurrentToken();
          const header = {
            Authorization: `Bearer ${currentToken}`,
          };

          response =
            await this.httpService.axiosRef.get<SearchAvailabilityApiResponse>(
              url,
              {
                headers: header,
                params: {
                  date: date,
                  time_start: timeStartFormatted,
                  time_end: timeEndFormatted,
                  type: 'space',
                  capacity: capacityRange,
                },
              },
            );
        } catch (error: any) {
          if (
            error.response &&
            (error.response.status === HTTP_UNAUTHORIZED ||
              error.response.status === HTTP_FORBIDDEN) &&
            retryCount < MAX_RETRIES
          ) {
            retryCount++;
            // Force token refresh and retry
            await this.libcalAuthorizationService.refreshToken();
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('Failed to get response after maximum retries');
      }

      availableRooms = response.data.exact_matches;
      if (availableRooms.length > 0) {
        break;
      }
    }

    return availableRooms.map<Room>((room: RoomAvailability) => {
      return {
        id: room.space.id,
        roomCodeName: room.space.name,
        capacity: room.space.capacity,
      };
    });
  }

  /**
   * Check if any required field is missing from the llmToolInput
   * @param llmToolInput
   * @param requiredFields
   * @returns
   */
  private checkLlmInput(
    llmToolInput: LlmToolInput,
    requiredFields: string[],
  ): string[] {
    const missingFields = [];
    for (const field of requiredFields) {
      if (
        llmToolInput[field] === null ||
        llmToolInput[field] === 'null' ||
        llmToolInput[field] === undefined ||
        llmToolInput[field] === 'undefined'
      ) {
        missingFields.push(field);
      }
    }
    return missingFields;
  }

  public async toolRunForLlm(llmToolInput: LlmToolInput): Promise<string> {
    const missingField = this.checkLlmInput(llmToolInput, [
      'date',
      'startTime',
      'endTime',
    ]);

    if (missingField.length !== 0) {
      return `Cannot use this tool because missing paramters ${JSON.stringify(missingField)}.Ask the customer to provide these data.`;
    }
    let roomCapacity: number | null;
    if (
      !(
        llmToolInput.roomCapacity === null ||
        llmToolInput.roomCapacity === undefined ||
        llmToolInput.roomCapacity === 'null' ||
        llmToolInput.roomCapacity === 'undefined'
      )
    ) {
      roomCapacity = parseInt(llmToolInput.roomCapacity);
    } else {
      roomCapacity = null;
    }

    const availableRooms = await this.fetchAvailableRooms(
      llmToolInput.date!,
      llmToolInput.startTime!,
      llmToolInput.endTime!,
      roomCapacity,
    );
    if (availableRooms.length === 0)
      return 'No room available for the input at that time.';

    //Censor roomId before returning to user
    const availableRoomsCensored = availableRooms
      .map((room: Room) => {
        return {
          roomName: room.roomCodeName,
          capacity: room.capacity,
        };
      })
      .sort((room1, room2) => room1.capacity - room2.capacity);

    return `Some rooms satisfy the input conditions:${JSON.stringify(availableRoomsCensored.slice(0, 5))}.Tell the customer all the room numbers with according capacities`;
  }

  onModuleDestroy() {
    this.tokenSubscription.unsubscribe();
  }
}

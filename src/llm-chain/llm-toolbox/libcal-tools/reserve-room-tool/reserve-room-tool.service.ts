import 'datejs';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { LlmTool, LlmToolInput } from '../../llm-tool.interface';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { CheckRoomAvailabilityToolService } from '../check-room-availability-tool/check-room-availability-tool.service';
import { HttpService } from '@nestjs/axios';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { Subscription } from 'rxjs';
import { AxiosResponse } from 'axios';
import { DatabaseService } from '../../../../database/database.service';

@Injectable()
export class ReserveRoomToolService implements LlmTool, OnModuleDestroy {
  private readonly logger = new Logger(ReserveRoomToolService.name);
  public readonly toolName: string = 'StudyRoomReservationTool';
  public readonly toolDescription: string =
    "This tool is for study room reservation.Currently,this tool only supports King Library Building;if the customer mentions about any other building,tell them you cannot support them.No need to use tool CheckRoomAvailabilityTool before using this tool.Use Final Answer instead if you don't have enough required parameters yet.Every parameter has to be provided by the customer;ASK them if they have not provided.NEVER predict!Don't include any single quotes in the paramter.";

  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      firstName:
        'string[REQUIRED][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      lastName:
        'string[REQUIRED][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      email:
        'string[REQUIRED][@miamioh.edu email][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      date: 'string[REQUIRED][format YYYY-MM-DD][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      startTime:
        'string[REQUIRED][format HH-MM ranging from 00:00 to 23:59][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      endTime:
        'string[REQUIRED][format HH-MM ranging from 00:00 to 23:59][This has to be provided by the customer.Ask them if they have not provided.NEVER predict!]',
      roomCapacity:
        'string[OPTIONAL][capacity(number of people using the room)of the room you wish to reserve.]',
      roomCodeName:
        'string|null[OPTIONAL][such as: 145, 211, 297A, 108C, etc.]',
    };

  private readonly ROOM_RESERVATION_URL =
    this.retrieveEnvironmentVariablesService.retrieve<string>(
      'LIBCAL_RESERVATION_URL',
    );
  // The default building is King Library at the moment
  private DEFAULT_BUILDING_ID =
    this.retrieveEnvironmentVariablesService.retrieve<string>('KING_BUILDING');

  private accessToken: string = '';
  private tokenSubscription: Subscription;
  private readonly TIMEZONE = 'America/New_York'; // Proper timezone identifier for EST/EDT

  constructor(
    private httpService: HttpService,
    private databaseService: DatabaseService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
    private libcalAuthorizationService: LibcalAuthorizationService,
    private checkRoomAvailabilityToolService: CheckRoomAvailabilityToolService,
  ) {
    this.tokenSubscription = this.libcalAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token) => (this.accessToken = token));
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

  /**
   * Robustly check if the variable is undefined or null or "undefined" or "null"
   * @param variable
   * @returns True if variable is undefined or null or the string of them. False otherwise
   */
  private isNullAndUndefined(variable: any): boolean {
    return (
      variable === null ||
      variable === 'null' ||
      variable === undefined ||
      variable === 'undefined'
    );
  }

  /**
   * Reserve study room via API
   * @param startTimestamp
   * @param endTimestamp
   * @param firstName
   * @param lastName
   * @param email
   * @param roomId
   * @returns succeed flag and message from API
   */
  private async reserveRoomWithApi(
    startTimestamp: Date,
    endTimestamp: Date,
    firstName: string,
    lastName: string,
    email: string,
    roomId: string,
  ): Promise<{
    succeed: boolean;
    bookingId?: string;
    message?: string;
  }> {
    const isProductionMode =
      this.retrieveEnvironmentVariablesService.retrieve('NODE_ENV') ===
      'production'
        ? 1
        : 0;

    const payload = {
      start: startTimestamp.toISOString(),
      fname: firstName,
      lname: lastName,
      email: email,
      bookings: [
        {
          id: roomId,
          to: endTimestamp.toISOString(),
        },
      ],
      test: !isProductionMode,
    };
    const header = {
      Authorization: `Bearer ${this.accessToken}`,
    };

    //Axios post
    const HTTP_UNAUTHORIZED = 401;
    const HTTP_FORBIDDEN = 403;
    let response:
      | AxiosResponse<{
          booking_id: string;
          cost: number;
        }>
      | undefined;
    while (
      response === undefined ||
      response.status === HTTP_UNAUTHORIZED ||
      response.status === HTTP_FORBIDDEN
    ) {
      try {
        response = await this.httpService.axiosRef.post<{
          booking_id: string;
          cost: number;
        }>(this.ROOM_RESERVATION_URL, payload, { headers: header });
      } catch (error: any) {
        if (
          error.response.status === HTTP_UNAUTHORIZED ||
          error.response.status === HTTP_FORBIDDEN
        ) {
          await this.libcalAuthorizationService.resetToken();
          // Update the header with the new token
          header.Authorization = `Bearer ${this.accessToken}`;
          continue;
        }
        if (error.response !== undefined && error.response.data !== undefined) {
          const errorData = error.response.data as string;
          if (
            errorData.includes('not a valid starting slot') ||
            errorData.includes('not a valid ending slot')
          ) {
            return {
              succeed: false,
              message: 'Time slot is not available for your room',
            };
          } else if (
            errorData.includes('this exceeds the 120 minute booking limit')
          ) {
            return {
              succeed: false,
              message:
                'Booking exceeds the 120 minute booking limit.Each person only has 120 minute booking limit everyday.',
            };
          } else {
            this.logger.error(error);
            throw error;
          }
        }
      }
    }

    return {
      succeed: true,
      bookingId: isProductionMode ? response!.data.booking_id : 'testBookingId',
    };
  }

  public async toolRunForLlm(llmToolInput: LlmToolInput): Promise<string> {
    const missingField = this.checkLlmInput(llmToolInput, [
      'firstName',
      'lastName',
      'email',
      'date',
      'startTime',
      'endTime',
    ]);

    if (missingField.length !== 0) {
      return `Cannot use this tool because missing paramters ${JSON.stringify(missingField)}.Ask the customer to provide these data.`;
    }

    if (
      this.isNullAndUndefined(llmToolInput.roomCapacity) &&
      this.isNullAndUndefined(llmToolInput.roomCodeName)
    ) {
      return 'roomCapacity and roomCodeName cannot be both empty.Ask customer to specify one of them.';
    }

    let selectedRoom: { id: string; roomCodeName: string; capacity: number };

    //Filter room based on roomCodeName
    if (!this.isNullAndUndefined(llmToolInput.roomCodeName)) {
      const roomResult = await this.databaseService.getRoomIdFromRoomCodeName(
        llmToolInput.roomCodeName!,
        this.DEFAULT_BUILDING_ID,
      );
      if (roomResult === null) {
        return `There is no room called ${llmToolInput.roomCodeName}`;
      }
      selectedRoom = roomResult;
    } else {
      //Filter room based on roomCapacity
      const availableRooms =
        await this.checkRoomAvailabilityToolService.fetchAvailableRooms(
          llmToolInput.date!,
          llmToolInput.startTime!,
          llmToolInput.endTime!,
          parseInt(llmToolInput.roomCapacity!),
        );
      if (availableRooms.length === 0) return 'No room satisfies';
      //Select the room with smallest capacity to save space
      selectedRoom = availableRooms.reduce((minRoom, currentRoom) => {
        return currentRoom.capacity < minRoom.capacity ? currentRoom : minRoom;
      }, availableRooms[0]);
    }

    // Convert HH-MM format to HH:MM format for proper parsing
    const startTimeFormatted = llmToolInput.startTime!.replace('-', ':');
    const endTimeFormatted = llmToolInput.endTime!.replace('-', ':');
    
    // Create proper Date objects with timezone handling
    const startTimestamp = new Date(`${llmToolInput.date}T${startTimeFormatted}:00-05:00`); // EST is UTC-5
    const endTimestamp = new Date(`${llmToolInput.date}T${endTimeFormatted}:00-05:00`); // EST is UTC-5
    
    // Validate that dates are valid
    if (isNaN(startTimestamp.getTime()) || isNaN(endTimestamp.getTime())) {
      return `Invalid date or time format. Please use YYYY-MM-DD for date and HH-MM for time.`;
    }

    const { succeed, bookingId, message } = await this.reserveRoomWithApi(
      startTimestamp,
      endTimestamp,
      llmToolInput.firstName!,
      llmToolInput.lastName!,
      llmToolInput.email!,
      selectedRoom.id,
    );

    if (succeed) {
      return `${selectedRoom.roomCodeName} with capacity ${selectedRoom.capacity} is booked from ${llmToolInput.startTime} to ${llmToolInput.endTime} on ${llmToolInput.date}. Tell the customer that the reservation is successful and bookingId is ${bookingId}`;
    } else {
      return `Booking unsuccessfully.${message}`;
    }
  }

  onModuleDestroy() {
    this.tokenSubscription.unsubscribe();
  }
}

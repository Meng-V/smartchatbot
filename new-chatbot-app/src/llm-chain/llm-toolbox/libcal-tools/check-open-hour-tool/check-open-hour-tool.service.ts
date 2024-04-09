import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Subscription } from 'rxjs';
import { LlmTool } from '../../llm-tool.interface';
import { LibcalAuthorizationService } from '../../../../library-api/libcal-authorization/libcal-authorization.service';
import { RetrieveEnvironmentVariablesService } from '../../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type WeekAvailability = {
  [day in WeekDay]: { from: string; to: string };
};

@Injectable()
export class CheckOpenHourToolService implements LlmTool {
  // Env Variables
  private readonly OPEN_HOUR_URL =
    this.retrieveEnvironmentVariablesService.retrieve<string>(
      'LIBCAL_HOUR_URL',
    );

  public readonly toolName: string = 'CheckOpenHourService';
  readonly toolDescription: string =
    'This tool is for checking the open hours of the library.';
  readonly toolParametersStructure: { [parameterName: string]: string } = {
    date: 'string [REQUIRED][format YYYY-MM-DD]',
  };

  // Access token
  private accessToken: string = '';
  private tokenSubscription: Subscription;

  private readonly logger = new Logger(CheckOpenHourToolService.name);

  /**
   * Instantiate the CheckOpenHourToolService.
   */
  constructor(
    private libcalAuthorizationService: LibcalAuthorizationService,
    private httpService: HttpService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {
    this.tokenSubscription = this.libcalAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token: string) => {
        this.accessToken = token;
      });
  }

  /**
   * Format the dates as "YYYY-MM-DD" strings
   * @param date
   * @returns
   */
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getMondayAndSundayOfWeek(dateStr: string): string[] {
    const dateParts = dateStr.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is zero-based (0 = January, 1 = February, etc.)
    const day = parseInt(dateParts[2]);

    const date = new Date(year, month, day);
    const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate the difference in days between the input date and Monday
    const daysToMonday = (currentDay + 6) % 7;

    // Calculate the date of Monday
    const monday = new Date(year, month, day - daysToMonday);

    // Create an array of date strings from Monday to Sunday
    const datesOfWeek: string[] = [];
    for (let i = 0; i < 7; i++) {
      const newDate = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      );
      datesOfWeek.push(this.formatDateString(newDate));
    }
    return datesOfWeek;
  }

  public async toolRunForLlm(toolInput: {
    date: string | null | undefined;
  }): Promise<string> {
    if (
      toolInput.date === null ||
      toolInput.date === 'null' ||
      toolInput.date === undefined ||
      toolInput.date === 'undefined' ||
      toolInput.date === ''
    ) {
      return 'Cannot check the building hour without a date. Ask the customer to provide the date before checking.\n';
    }

    try {
      const response = `Open Hour of the requested week:
      ${JSON.stringify(
        await this.run(toolInput.date),
      )}.\nIf any day does not exist in the array, the library does not open that day. Always answer with both open hour and close hour to the customer.\n`;
      return response;
    } catch (error: any) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Run the check open hour service.
   * @param date
   * @returns
   */
  async run(date: string): Promise<WeekAvailability> {
    const header = {
      Authorization: `Bearer ${this.accessToken}`,
    };
    const weekdays = this.getMondayAndSundayOfWeek(date);

    try {
      const dayNames: WeekDay[] = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];

      const response = await this.httpService.axiosRef.get(
        `${this.OPEN_HOUR_URL}/8113`,
        {
          params: {
            from: weekdays[0],
            to: weekdays[weekdays.length - 1],
          },
          headers: header,
        },
      );

      let filteredData = weekdays.reduce(
        (prevObj, currentDay, currentIndex) => {
          return {
            ...prevObj,
            [dayNames[currentIndex]]: response.data[0].dates[currentDay].hours,
          };
        },
        {},
      );

      //   if (dayData && dayData.status === 'open') {
      //     acc[dayName] = {
      //       from: dayData.hours[0].from,
      //       to: dayData.hours[0].to,
      //     };
      //   }
      //   return acc; // Add this line to return the accumulator
      // }, {} as WeekAvailability); // Specify the initial value as an empty object of type WeekAvailability
      return filteredData as WeekAvailability;
    } catch (error: any) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  onModuleDestroy() {
    this.tokenSubscription.unsubscribe();
  }
}

import axios, { AxiosResponse } from "axios";
import { LibCalAPIBaseTool } from "./LibCalAPI";
import { retryWithMaxAttempts } from "../../Utils/NetworkUtils";

type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type WeekAvailability = { [day in WeekDay]: { from: string; to: string } };

class CheckOpenHourTool extends LibCalAPIBaseTool {
  private static instance: CheckOpenHourTool;

  public readonly name: string = "CheckOpenHourTool";
  public readonly description: string =
    "This tool is for searching for King Library's opening hours in the week of one input date.";

  public readonly parameters: { [parameterName: string]: string } = {
    date: "string [REQUIRED][format YYYY-MM-DD]",
  };

  constructor() {
    super();
    CheckOpenHourTool.instance = this;
  }

  public static getInstance(): CheckOpenHourTool {
    if (!CheckOpenHourTool.instance) {
      CheckOpenHourTool.instance = new CheckOpenHourTool();
    }
    return CheckOpenHourTool.instance;
  }

  /**
   * Format the dates as "YYYY-MM-DD" strings
   * @param date
   * @returns
   */
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private getMondayAndSundayOfWeek(dateStr: string): string[] {
    const dateParts = dateStr.split("-");
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
      const currentDate = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i
      );
      datesOfWeek.push(this.formatDateString(currentDate));
    }

    return datesOfWeek;
  }

  async toolRun(toolInput: { date: string | null }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (
        toolInput.date === null ||
        toolInput.date === "null" ||
        toolInput.date === undefined ||
        toolInput.date === "undefined"
      ) {
        resolve(
          "Cannot check the building hour without a date.Ask the customer to provide the date before checking."
        );
        return;
      }
      try {
        const toolResponse = `Open Hour of the requested week: ${JSON.stringify(
          await CheckOpenHourTool.run(toolInput.date)
        )}.If any day does not exist in the array, the library does not open that day.Always answer with both open hour and close hour to the customer.`;
        resolve(toolResponse);
      } catch (error: any) {
        reject(error);
      }
    });
  }

  static async run(date: string): Promise<WeekAvailability> {
    return new Promise<WeekAvailability>(async (resolve, reject) => {
      const instance = CheckOpenHourTool.instance;
      const accessToken: string = await instance.getAccessToken();
      const header = {
        Authorization: `Bearer ${accessToken}`,
      };
      const weekdays = instance.getMondayAndSundayOfWeek(date);

      try {
        const dayNames: WeekDay[] = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];

        let response: AxiosResponse<any, any>;
        try {
          response = await retryWithMaxAttempts<AxiosResponse<any, any>>(
            (): Promise<AxiosResponse<any, any>> => {
              return new Promise<AxiosResponse<any, any>>((resolve, reject) => {
                try {
                  const axiosResponse = axios({
                    method: "get",
                    headers: header,
                    url: `${instance.HOUR_URL}/8113`,
                    params: {
                      from: weekdays[0],
                      to: weekdays[weekdays.length - 1],
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
  
        let filteredData = weekdays.reduce((prevObj, day, index) => {
          return {
            ...prevObj,
            [dayNames[index]]: response.data[0].dates[day].hours,
          };
        }, {});
        resolve(filteredData as WeekAvailability);
      } catch (error: any) {
        reject(error);
      }
    });
  }
}

export { CheckOpenHourTool };

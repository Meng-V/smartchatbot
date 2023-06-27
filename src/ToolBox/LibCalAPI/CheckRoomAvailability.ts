import { ToolInput } from "../ToolTemplates";
import { LibCalAPIBaseTool } from "./LibCalAPI";
import axios, { AxiosError, AxiosResponse } from "axios";

type Timestamp = {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  timezone: string;
};

class CheckRoomAvailabilityTool extends LibCalAPIBaseTool {
  private static instance: CheckRoomAvailabilityTool;

  public readonly name: string = "CheckRoomAvailabilityTool";
  public readonly description: string =
    "This tool is for checking the available hours of a specific study room on one specific date. This tool has 2 parameters. Please use Final Answer instead if you don't have enough parameters yet. Don't include any single quotes in the paramter. The year is implicitly 2023";

  public readonly parameters: { [parameterName: string]: string } = {
    date: "string [format YYYY-MM-DD]",
    roomID: "string",
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

  private timestampStringtify(timestamp: Timestamp): string {
    function fillLeadingZero(number: number): string {
      return `${number < 10 ? "0" : ""}${number}`;
    }

    return `${fillLeadingZero(timestamp.year)}-${fillLeadingZero(
      timestamp.month
    )}-${fillLeadingZero(timestamp.date)}T${fillLeadingZero(
      timestamp.hour
    )}:${fillLeadingZero(timestamp.minute)}:${fillLeadingZero(
      timestamp.second
    )}${timestamp.timezone}`;
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
    const [year, month, date, timezone] = [
      hours[0].from.year,
      hours[0].from.month,
      hours[0].from.date,
      hours[0].from.timezone,
    ];
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

  async run(toolInput: ToolInput): Promise<string> {
    const { roomID, date } = toolInput;

    return new Promise<string>(async (resolve, reject) => {
      const response = await CheckRoomAvailabilityTool.run(roomID, date);

      resolve(response);
    });
  }

  /**
   * This function runs the tool as the description
   * @param roomID string
   * @param date Has to follow YYYY-MM-DD format
   * @returns
   */
  static async run(roomID: string, date: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const instance = CheckRoomAvailabilityTool.getInstance();
      const accessToken: string = await instance.getAccessToken();
      const header = {
        Authorization: `Bearer ${accessToken}`,
      };

      try {
        let response = await axios({
          method: "get",
          headers: header,
          url: `${instance.available_url}/${roomID}`,
          params: {
            availability: date,
          },
        });
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
          JSON.stringify(
            mergedTimeBlock.map((timeBlock) => {
              return {
                from: instance.timestampStringtify(timeBlock.from),
                to: instance.timestampStringtify(timeBlock.to),
              };
            })
          )
        );
      } catch (error: any) {
        console.log(error);
      }
    });
  }
}

export { CheckRoomAvailabilityTool };

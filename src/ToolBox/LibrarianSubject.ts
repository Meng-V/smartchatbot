import axios from "axios";
import { Tool, ToolInput } from "./ToolTemplates";
import prisma from "../../prisma/prisma";

import * as synonymJSON from "../../synonyms.json";
import { LibcalSubject, LibrarianInformation } from "./libcal.types";

type SubjectLibrarianMap = {
  [subject: string]: { name: string; email: string }[];
};

type SynonymsData = {
  [key: string]: string[];
};
const synonymsData: SynonymsData = synonymJSON;

class LibrarianSubjectSearchTool implements Tool {
  private static instance: LibrarianSubjectSearchTool;

  name: string = "LibrarianSearchWithSubjectTool";
  description: string =
    "This tool is useful for searching which librarians are responsible for a specific subject(such as Computer Science,Finance,Environmental Studies,Biology,etc).";

  parameters: { [parameterName: string]: string } = {
    subjectName: "string[REQUIRED]",
  };

  private synonymMapping: Map<string, string> = new Map<string, string>();

  protected readonly OAUTH_URL = process.env["LIBAPPS_OAUTH_URL"]!;
  protected readonly CLIENT_ID = process.env["LIBAPPS_CLIENT_ID"]!;
  protected readonly CLIENT_SECRET = process.env["LIBAPPS_CLIENT_SECRET"]!;
  protected readonly GRANT_TYPE = process.env["LIBAPPS_GRANT_TYPE"]!;

  protected constructor() {
    this.initializeChoices();
  }

  protected async getAccessToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      //const timeout = setTimeout(() => {
      //        reject("Request Time Out");
      //      }, 5000);
      const response = await axios({
        method: "post",
        url: this.OAUTH_URL,
        data: {
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          grant_type: this.GRANT_TYPE,
        },
      });

      resolve(response.data.access_token!);
    });
  }

  public static getInstance(): LibrarianSubjectSearchTool {
    if (!LibrarianSubjectSearchTool.instance) {
      LibrarianSubjectSearchTool.instance = new LibrarianSubjectSearchTool();
    }

    return LibrarianSubjectSearchTool.instance;
  }

  private initializeChoices() {
    for (let choice in synonymsData) {
      if (
        Array.isArray(synonymsData[choice]) &&
        synonymsData[choice].length > 0
      ) {
        synonymsData[choice].forEach((synonym: string) => {
          this.synonymMapping.set(
            synonym.toLowerCase().trim(),
            choice.toLowerCase().trim()
          );
        });
      }
    }
  }

  private levenshteinDistance(text1: string, text2: string): number {
    text1 = text1.trim().toLowerCase();
    text2 = text2.trim().toLowerCase();

    const m = text1.length;
    const n = text2.length;

    let dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(m + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) {
      dp[0][i] = i;
    }
    for (let i = 0; i <= n; i++) {
      dp[i][0] = i;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (text1[j - 1] === text2[i - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;

          if (
            i > 1 &&
            j > 1 &&
            text1[j - 1] === text2[i - 2] &&
            text1[j - 2] === text2[i - 1]
          ) {
            dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
          }
        }
      }
    }

    return dp[n][m];
  }

  /**
   * Fuzzy match with the closest string available
   * @param query string to query
   * @param choices list of string you want to search from
   * @param numberOfResult number of result you want to receive
   * @param threshold range 0-1
   * @returns
   */
  private fuzzybestMatch(
    query: string,
    choices: string[],
    numberOfResult: number = 2,
    threshold: number = 0.45
  ): [number, string][] {
    let result: [number, string][] = [];
    query = query.toLowerCase().trim();
    // Check for exact matches first
    if (this.synonymMapping.has(query)) {
      return [[1, this.synonymMapping.get(query)!]];
    }

    // Fallback to fuzzy matching using Levenshtein distance
    for (let choice of choices) {
      const matchScore = Math.max(
        1 -
          this.levenshteinDistance(query, choice) /
            Math.max(query.length, choice.length),
        this.synonymMapping.has(choice)
          ? 1 -
              this.levenshteinDistance(
                query,
                this.synonymMapping.get(choice)!.toLocaleLowerCase().trim()
              ) /
                Math.max(query.length, this.synonymMapping.get(choice)!.length)
          : 0
      );
      if (matchScore < threshold) continue;
      result.push([matchScore, choice]);
      result.sort((a, b) => b[0] - a[0]);
      if (result.length > numberOfResult) result.pop();
    }

    return result;
  }

  /**
   * Fetch Librarian data from Libcal API
   * @returns
   */
  private async fetchLibrarianSubjectData(): Promise<LibrarianInformation[]> {
    return new Promise<LibrarianInformation[]>(async (resolve, reject) => {
      try {
        const instance = LibrarianSubjectSearchTool.instance;
        const header = {
          Authorization: `Bearer ${await instance.getAccessToken()}`,
        };
        const response = await axios({
          method: "get",
          headers: header,
          url: "https://lgapi-us.libapps.com/1.2/accounts",
          params: {
            "expand[]": "subjects",
          },
        });
        resolve(response.data);
      } catch (error) {
        console.error(error);
        reject([
          "Sorry, there was an error fetching the librarian data. Please try again.",
        ]);
      }
    });
  }

  async toolRun(toolInput: ToolInput): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        let nullFields: string[] = [];
        for (const param of Object.keys(toolInput)) {
          if (
            toolInput[param] === null ||
            toolInput[param] === "null" ||
            toolInput[param] === undefined ||
            toolInput[param] === "undefined"
          ) {
            nullFields.push(param);
          }
        }
        if (nullFields.length > 0) {
          console.log(
            `Cannot search for librarian because missing parameter ${JSON.stringify(
              nullFields
            )}. Ask the customer to provide ${JSON.stringify(
              nullFields
            )} to search for librarian.`
          );
          resolve(
            `Cannot search for librarian because missing parameter ${JSON.stringify(
              nullFields
            )}. Ask the customer to provide ${JSON.stringify(
              nullFields
            )} to search for librarian.`
          );
          return;
        }

        const { subjectName } = toolInput;
        const response = await LibrarianSubjectSearchTool.run(
          subjectName as string
        );

        if ("error" in response) {
          resolve(`Error: ${response.error}`);
          return;
        }

        resolve(
          `These are the librarians that can help you with the requested subject: ${JSON.stringify(
            response
          )}`
        );
      } catch (error) {
        console.error(error);
        reject("Sorry, there was an APIResponse error. Please try again.");
      }
    });
  }

  /**
   * Get the librarian responsible for the input subject
   * @param querySubjectName
   * @returns Map from closely-related subject to librarian information
   * @throws Error if tool has run time error
   */
  static async run(
    querySubjectName: string
  ): Promise<SubjectLibrarianMap | { error: string }> {
    return new Promise<SubjectLibrarianMap | { error: string }>(
      async (resolve, reject) => {
        try {
          const instance = LibrarianSubjectSearchTool.instance;
          const librarianInformationList: LibrarianInformation[] =
            await instance.fetchLibrarianSubjectData();

          const subjectToLibrarianMap: SubjectLibrarianMap = {};

          // Iterate over the data array and populate the map
          librarianInformationList.forEach(
            (librarianInformation: LibrarianInformation) => {
              const librarianName: string = `${librarianInformation.first_name} ${librarianInformation.last_name}`;
              const librarianEmail: string = librarianInformation.email;
              if (
                librarianInformation.subjects === null ||
                librarianInformation.subjects === undefined
              )
                return;
              librarianInformation.subjects.forEach(
                (subject: LibcalSubject) => {
                  if (
                    subjectToLibrarianMap[subject.name] === undefined ||
                    subjectToLibrarianMap[subject.name] === null
                  ) {
                    subjectToLibrarianMap[subject.name] = [];
                  }
                  subjectToLibrarianMap[subject.name].push({
                    name: librarianName,
                    email: librarianEmail,
                  });
                }
              );
            }
          );

          const subjectNames: string[] = [
            ...Object.keys(subjectToLibrarianMap),
          ];

          let mainSubjectName = instance.synonymMapping.get(
            querySubjectName.toLowerCase().trim()
          );
          if (!mainSubjectName) {
            mainSubjectName = querySubjectName;
          }
          const bestMatchSubject = instance
            .fuzzybestMatch(mainSubjectName, subjectNames, 2)
            .map((match) => match[1]);

          //Filter the Map to only contained suitable subject
          const filteredSubjectToLibrarianMap: SubjectLibrarianMap = {};
          Object.keys(subjectToLibrarianMap).forEach((subjectName) => {
            // Check if the subjectName is in the selectedSubjects array
            if (!bestMatchSubject.includes(subjectName)) return;
            
            subjectToLibrarianMap[subjectName].forEach(
              (librarianInfo: { name: string; email: string }) => {
                //Init if key does not exist
                if (
                  filteredSubjectToLibrarianMap[subjectName] === undefined ||
                  filteredSubjectToLibrarianMap[subjectName] === null
                ) {
                  filteredSubjectToLibrarianMap[subjectName] = [];
                }

                filteredSubjectToLibrarianMap[subjectName].push(librarianInfo);
              }
            );
          });

          if (Object.keys(filteredSubjectToLibrarianMap).length === 0) {
            resolve({
              error:
                "Sorry, the requested subject has no match with our subject database. Please try another subject.",
            });
            return;
          }

          resolve(filteredSubjectToLibrarianMap);
        } catch (error) {
          console.error(error);
          throw new Error("Librarian Subject tool error");
        }
      }
    );
  }
}

export { LibrarianSubjectSearchTool };

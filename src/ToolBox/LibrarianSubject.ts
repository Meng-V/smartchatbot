import axios from "axios";
import { Tool, ToolInput } from "./ToolTemplates";
import prisma from "../../prisma/prisma";
import { exists } from "fp-ts/lib/Option";
import { Prisma } from "@prisma/client";
import * as synonymJSON from '../../synonyms.json';

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

  private synonymMapping: Map<string, string> = new Map<string, string>;

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
      if (Array.isArray(synonymsData[choice]) && synonymsData[choice].length > 0) {
        synonymsData[choice].forEach((synonym: string) => {
          this.synonymMapping.set(synonym.toLowerCase().trim(), choice.toLowerCase().trim());
        });
      }
    }
  }
  

  private levenshteinDistance(text1: string, text2: string): number {
    text1 = text1.trim().toLowerCase();
    text2 = text2.trim().toLowerCase();
  
    const m = text1.length;
    const n = text2.length;
  
    let dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  
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
  
          if (i > 1 && j > 1 && text1[j - 1] === text2[i - 2] && text1[j - 2] === text2[i - 1]) {
            dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
          }
        }
      }
    }
  
    return dp[n][m];
  }
  

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
      return [[1, this.synonymMapping.get(query)!]]
    }
  
    // Fallback to fuzzy matching using Levenshtein distance
    for (let choice of choices) {
      const matchScore = Math.max(
        1 -
          this.levenshteinDistance(query, choice) /
            Math.max(query.length, choice.length),
        this.synonymMapping.has(choice)
          ? 1 -
              this.levenshteinDistance(query, this.synonymMapping.get(choice)!.toLocaleLowerCase().trim()) /
                Math.max(query.length, this.synonymMapping.get(choice)!.length)
          : 0,
      );
      if (matchScore < threshold) continue;
      result.push([matchScore, choice]);
      result.sort((a, b) => b[0] - a[0]);
      if (result.length > numberOfResult) result.pop();
    }
  
    return result;
  }
  

  private async fetchLibrarianSubjectData(): Promise<any[]> {
    return new Promise<any[]>(async (resolve, reject) => {
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
        reject(
          ["Sorry, there was an error fetching the librarian data. Please try again."]
        );
      }

      // const subjectToLibrarian: Map<string, { [key: string]: string }[]> =
      //   new Map();
      // for (let librarian of response.data) {
      //   const name = `${librarian.first_name} ${librarian.last_name}`;
      //   librarian.subjects.forEach(
      //     (subject: { id: string; name: string; slug_id: string }) => {
      //       if (!subjectToLibrarian.has(subject.name))
      //         subjectToLibrarian.set(subject.name, []);
      //       subjectToLibrarian.set(subject.name, [
      //         ...subjectToLibrarian.get(subject.name)!,
      //         { name: name, email: librarian.email },
      //       ]);
      //     }
      //   );
      // }
    });
  }

  /**
   * Update database of Librarian and Subject if it's too outdated
   * @param updateDuration if the most recent update is older than this threshold (days). New data would be updated into database
   * @returns True if it performs update, False otherwise
   */
  private async updateLibrarianSubjectDatabase(
    updateDuration: number,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const savedLibrarians = await prisma.librarian.findMany();
        let didUpdate = false;
        if (
          !savedLibrarians ||
          savedLibrarians.length === 0 ||
          new Date().valueOf() - savedLibrarians[0].lastUpdated.valueOf() >
            updateDuration * 1000 * 60 * 60 * 24
        ) {
          didUpdate = true;
          const librarians = await this.fetchLibrarianSubjectData();
          for (let librarian of librarians) {
            await prisma.librarian.upsert({
              where: {
                uuid: librarian.uuid,
              },
              update: {
                subjects: {
                  upsert: !librarian.subjects
                    ? []
                    : librarian.subjects.map(
                        (subject: {
                          id: string;
                          name: string;
                          slug_id: number;
                        }) => ({
                          where: {
                            id: subject.id,
                            name: subject.name.toLowerCase().trim(),
                          },
                          update: {},
                          create: { id: subject.id, name: subject.name },
                        }),
                      ),
                },
              },
              create: {
                id: librarian.id,
                uuid: librarian.uuid,
                firstName: librarian.first_name,
                lastName: librarian.last_name,
                email: librarian.email,
                subjects: {
                  connectOrCreate: !librarian.subjects
                    ? []
                    : librarian.subjects.map(
                        (subject: {
                          id: string;
                          name: string;
                          slug_id: number;
                        }) => {
                          return {
                            where: { id: subject.id },
                            create: {
                              id: subject.id,
                              name: subject.name,
                            },
                          };
                        },
                      ),
                },
              },
            });
          }
        }
        resolve(didUpdate);
      } catch (error) {
        reject(false);
      }
    });
  }

  async toolRun(toolInput: ToolInput): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        let nullFields = [];
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
              nullFields,
            )}. Ask the customer to provide ${JSON.stringify(
              nullFields,
            )} to search for librarian.`,
          );
          resolve(
            `Cannot search for librarian because missing parameter ${JSON.stringify(
              nullFields,
            )}. Ask the customer to provide ${JSON.stringify(
              nullFields,
            )} to search for librarian.`,
          );
          return;
        }

        const { subjectName } = toolInput;
        const response = await LibrarianSubjectSearchTool.run(
          subjectName as string,
        );
  
        if ("error" in response) {
          resolve(`Error: ${response.error}`);
          return;
        }
  
        resolve(
          `These are the librarians that can help you with the requested subject: ${JSON.stringify(response)}`
        );
      } catch (error) {
        console.error(error);
        reject("Sorry, there was an error. Please try again.");
      }
    });
  }

  static async run(
    querySubjectName: string,
  ): Promise<SubjectLibrarianMap | { error: string }> {
    return new Promise<SubjectLibrarianMap | { error: string }>(
      async (resolve, reject) => {
        try {
          const instance = LibrarianSubjectSearchTool.instance;
          await instance.updateLibrarianSubjectDatabase(30);

          const subjects = await prisma.subject.findMany();
          const subjectNames = subjects.map((subject) => subject.name);
          let mainSubjectName = instance.synonymMapping.get(querySubjectName.toLowerCase().trim());
          if (!mainSubjectName) {
            mainSubjectName = querySubjectName; 
          }
          const bestMatchSubject = instance.fuzzybestMatch(mainSubjectName, subjectNames, 2)
                                  .map(match => match[1]); 

          const subjectsWithLibrarian = await prisma.subject.findMany({
            where: {
              name: { in: bestMatchSubject.map((subjectData) => subjectData[1]) },
            },
            include: { assignedLibrarians: true },
          });

          const resultObject = subjectsWithLibrarian.reduce(
            (prevObject, curSubject) => {
              return {
                ...prevObject,
                [curSubject.name]: {
                  librarianName: curSubject.assignedLibrarians.map(
                    (librarian) => {
                      return {
                        name: `${librarian.firstName} ${librarian.lastName}`,
                        email: librarian.email,
                      };
                    },
                  ),
                },
              };
            },
            {},
          );
          // console.log(JSON.stringify(resultObject));
          if (Object.keys(resultObject).length === 0) {
            resolve({
              error:
                "Sorry, the requested subject has no match with our subject database. Please try another subject.",
            });
            // return;
          }

          resolve(resultObject);

        } catch (error) {
          console.error(error);
          reject({ error: "Sorry, the requested subject has no match with our subject database. Please try another subject."})
        }
      },
    );
  }
}

export { LibrarianSubjectSearchTool };

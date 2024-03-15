import { Injectable, Logger } from '@nestjs/common';
import { LlmTool, LlmToolInput } from '../../llm-tool.interface';

import * as synonymJSON from './subject-synonyms.json';
import { LibappsAuthorizationService } from '../../../../library-api/libapps-authorization/libapps-authorization.service';
import { Subscription } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

type SubjectLibrarianMap = {
  [subject: string]: { name: string; email: string }[];
};

type Subject = {
  id: number;
  name: string;
  slug_id: number;
};

export type LibrarianInformation = {
  id: number;
  email: string;
  uuid: string;
  first_name: string;
  last_name: string;
  title: string;
  subjects: Subject[];
  [key: string]: any;
};

@Injectable()
export class LibrarianSubjectLookupService implements LlmTool {
  public readonly toolName: string = 'LibrarianSearchWithSubjectTool';
  public readonly toolDescription: string =
    'This tool is useful for searching which librarians are responsible for a specific subject(such as Computer Science,Finance,Environmental Studies,Biology,etc).';
  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      subjectName: 'string[REQUIRED]',
    };

  private synonymMapping: Map<string, string> = new Map<string, string>();

  private accessToken: string = '';
  private tokenSubscription: Subscription;

  private readonly logger = new Logger(LibrarianSubjectLookupService.name);

  constructor(
    private libappsAuthorizationService: LibappsAuthorizationService,
    private httpService: HttpService,
  ) {
    const synonymData: { [key: string]: string[] } = synonymJSON;
    this.synonymMapping = this.getSynonymMapping(synonymData);

    this.tokenSubscription = this.libappsAuthorizationService
      .getAccessTokenObservable()
      .subscribe((token) => (this.accessToken = token));
  }

  /**
   * For initialize the synonymMapping from the data at the imported json file
   */
  private getSynonymMapping(synonymData: {
    [key: string]: string[];
  }): Map<string, string> {
    const synonymMapping: Map<string, string> = new Map<string, string>();
    for (let choice in synonymData) {
      if (
        Array.isArray(synonymData[choice]) &&
        synonymData[choice].length > 0
      ) {
        synonymData[choice].forEach((synonym: string) => {
          synonymMapping.set(
            synonym.toLowerCase().trim(),
            choice.toLowerCase().trim(),
          );
        });
      }
    }

    return synonymMapping;
  }
  /**
   * Calculating Levenshtein Distance between 2 input text
   * @param text1
   * @param text2
   * @returns the Levenshtein Distance
   */
  private levenshteinDistance(text1: string, text2: string): number {
    text1 = text1.trim().toLowerCase();
    text2 = text2.trim().toLowerCase();

    const m = text1.length;
    const n = text2.length;

    let dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(m + 1).fill(0),
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
   * Fuzzy match the query with the best matched strings from choices
   * @param query
   * @param choices
   * @param numberOfResult
   * @param threshold
   * @returns
   */
  private fuzzybestMatch(
    query: string,
    choices: string[],
    numberOfResult: number = 2,
    threshold: number = 0.45,
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
                this.synonymMapping.get(choice)!.toLocaleLowerCase().trim(),
              ) /
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

  /**
   * Fetch the librarian subject data from libapps api
   * @returns
   */
  public async fetchLibrarianSubjectData(): Promise<LibrarianInformation[]> {
    const fetchData = async (accessToken: string): Promise<AxiosResponse> => {
      const header = {
        Authorization: `Bearer ${this.accessToken}`,
      };

      const response = await this.httpService.axiosRef.get<
        LibrarianInformation[]
      >('https://lgapi-us.libapps.com/1.2/accounts', {
        headers: header,
        params: {
          'expand[]': 'subjects',
        },
      });

      return response;
    };
    const HTTP_UNAUTHORIZED = 403;
    let response: AxiosResponse | undefined;
    while (response === undefined || response.status === HTTP_UNAUTHORIZED) {
      response = await fetchData(this.accessToken);
      if (response.status === HTTP_UNAUTHORIZED) {
        this.libappsAuthorizationService.resetToken();
      }
    }

    return response.data as LibrarianInformation[];
  }

  /**
   * Return the array of parameters that are null or undefined
   * @param llmToolInput
   * @returns the array of parameters that are null or undefined in the llmToolInput
   */
  private checkLlmToolInput(llmToolInput: LlmToolInput): string[] {
    let nullFields: string[] = [];
    for (const param of Object.keys(llmToolInput)) {
      if (
        llmToolInput[param] === null ||
        llmToolInput[param] === 'null' ||
        llmToolInput[param] === undefined ||
        llmToolInput[param] === 'undefined'
      ) {
        nullFields.push(param);
      }
    }

    return nullFields;
  }

  public async toolRunForLlm(llmToolInput: LlmToolInput): Promise<string> {
    const nullFields = this.checkLlmToolInput(llmToolInput);

    //Insufficient parameters, feedback the status with the LLM
    if (nullFields.length > 0) {
      return `Cannot search for librarian because missing parameter ${JSON.stringify(
        nullFields,
      )}. Ask the customer to provide ${JSON.stringify(
        nullFields,
      )} to search for librarian.`;
    }

    const { subjectName } = llmToolInput;
    //Already check for null in this.checkLlmToolInput()
    const querySubjectName = subjectName!;

    try {
      const librarianInformationList: LibrarianInformation[] =
        await this.fetchLibrarianSubjectData();

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
          librarianInformation.subjects.forEach((subject: Subject) => {
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
          });
        },
      );

      const subjectNames: string[] = [...Object.keys(subjectToLibrarianMap)];

      let mainSubjectName = this.synonymMapping.get(
        querySubjectName.toLowerCase().trim(),
      );
      if (!mainSubjectName) {
        mainSubjectName = querySubjectName;
      }
      const bestMatchSubject = this.fuzzybestMatch(
        mainSubjectName,
        subjectNames,
        1,
      ).map((match) => match[1]);

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
          },
        );
      });

      if (Object.keys(filteredSubjectToLibrarianMap).length === 0) {
        return 'Sorry, the requested subject has no match with our subject database. Please try another subject.';
      }

      return `These are the librarians that can help you with the requested subject: ${JSON.stringify(
        filteredSubjectToLibrarianMap,
      )}`;
    } catch (error) {
      console.error(error);
      throw new Error('Librarian Subject tool error');
    }
  }
}

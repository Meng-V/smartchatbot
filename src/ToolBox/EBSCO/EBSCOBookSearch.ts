import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { Tool } from "../ToolTemplates";
import { searchBooks } from "./utils/ebscoService";

class EBSCOBookSearchTool implements Tool {
  private static instance: EBSCOBookSearchTool;

  public name: string = "EBSCOBookSearchTool";

  // public description: string =
  //   "EBSCOBookSearchTool searches academic resources using an EBSCO query. The following codes are used to represent specific types of data: TX=All Text, AU=Author, TI=Title, SU=Subject, SO=Source, AB=Abstract, IS=ISSN [8-digit code], IB=ISBN [13 digits code]. Use logical operators such as AND/OR to combine search terms. Use proximity operators such as NEAR(N), WITHIN(W) to specify the closeness of terms. For a more precise search, use quotes for an exact phrase, * for a wildcard, ? for single character substitution, # for single/no character substitution.";

  // public parameters: { [parameterName: string]: string } = {
  //   query:
  //     "REQUIRED string. Use an EBSCO query format. For example, 'AU Gaiman AND TI Sandman'. Avoid using special characters except when implementing specific search techniques.",
  // };
  public description: string =
    "EBSCOBookSearchTool searches academic resources using an EBSCO query. Use specific book titles in your query rather than referring to their order in a series. The following codes are used to represent specific types of data: TX=All Text, AU=Author, TI=Title, SU=Subject, SO=Source, AB=Abstract, IS=ISSN [8-digit code], IB=ISBN [13 digits code]. Use logical operators such as AND/OR to combine search terms. Use proximity operators such as NEAR(N), WITHIN(W) to specify the closeness of terms. For a more precise search, use quotes for an exact phrase, * for a wildcard, ? for single character substitution, # for single/no character substitution.";

  public parameters: { [parameterName: string]: string } = {
    query:
      "REQUIRED string. Use an EBSCO query format with specific book titles. For example, 'AU Gaiman AND TI Sandman'. Avoid using special characters except when implementing specific search techniques. Don't use numerical order of books in a series, instead use the exact book titles.",
  };

  private constructor() {
    EBSCOBookSearchTool.instance = this;
  }

  public static getInstance(): EBSCOBookSearchTool {
    if (!EBSCOBookSearchTool.instance) {
      EBSCOBookSearchTool.instance = new EBSCOBookSearchTool();
    }
    return EBSCOBookSearchTool.instance;
  }

  async toolRun(toolInput: { query: string }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const { query } = toolInput;
      console.log(query, " in tool run");
      if (
        query === null ||
        query === "null" ||
        query === undefined ||
        query === "undefined"
      ) {
        resolve("Input query not found. Please use a query");
        return;
      }
      const response = await EBSCOBookSearchTool.run(query);
      if (response.length === 0) {
        resolve("Sorry, no results were found for your query.");
      } else {
          resolve(
              `Please interpret this JSON result to the customer in a markdown language output. ${JSON.stringify(
              response,
              )}`,
          );
      }
    });
  }

  static async run(query: string): Promise<
    {
      title: string;
      author: string;
      publicationYear: number;
      url: string;
      location: string;
    }[]
  > {
    return new Promise<
      {
        title: string;
        author: string;
        publicationYear: number;
        url: string;
        location: string;
      }[]
    >(async (resolve, reject) => {
      const searchResults = await searchBooks(query, 2);
      console.log("run method:", searchResults);
      if (searchResults.length === 0) {
        console.log("No results found for the given query");
        reject([]);
      }
      const filteredSearchResult = searchResults.map((record) => {
        let location = "";

        for (const info of record.locationInformation) {
          location += `${info.Sublocation} - ${info.ShelfLocator}\n`;
        }
        location = location.trim();
        return {
          title: record.title,
          author: record.author,
          publicationYear: record.publicationYear,
          url: record.url,
          location: location,
        };
      });
      resolve(filteredSearchResult);
    });
  }
}

export { EBSCOBookSearchTool };

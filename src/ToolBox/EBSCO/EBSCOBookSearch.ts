import { Tool } from "../ToolTemplates";
import { searchBooks } from "./utils/ebscoService";

class EBSCOBookSearchTool implements Tool {
  private static instance: EBSCOBookSearchTool;

  public name: string = "EBSCOBookSearchTool";
//   public description: string =
//   "This tool searches for academic books/articles based on user-provided keywords, such as economics, pattern matching, DNA, Evolution, etc. The input query should be in the format of an EBSCO query, which includes codes to represent specific types of data (TX for All Text, AU for Author, TI for Title, SU for Subject Terms, SO for Journal Title/Source, AB for Abstract, IS for ISSN, IB for ISBN) and logical operators (AND/OR). The query can also utilize proximity operators (NEAR (N), WITHIN (W)), exact phrase search using quotes, wildcard character (*), single character substitution (?), and single/no character substitution (#).";

// public parameters: { [parameterName: string]: string } = {
//   query:
//     'string [REQUIRED] The input should be an EBSCO formatted query. For example, "SU+Math+AND+TI+Geometry+AND+AU+Gaim". Avoid using commas, double quotes or single quotes. Proximity, exact phrase search, wildcard, and character substitution queries are supported.',
// };

public description: string = 
"EBSCOBookSearchTool searches academic resources using an EBSCO query. The following codes are used to represent specific types of data: TX=All Text, AU=Author, TI=Title, SU=Subject, SO=Source, AB=Abstract, IS=ISSN, IB=ISBN. Use logical operators such as AND/OR to combine search terms. Use proximity operators such as NEAR(N), WITHIN(W) to specify the closeness of terms. For a more precise search, use quotes for an exact phrase, * for a wildcard, ? for single character substitution, # for single/no character substitution.";

public parameters: { [parameterName: string]: string } = {
query: 
  "REQUIRED string. Use an EBSCO query format. For example, 'AU Gaiman AND TI Sandman'. Avoid using special characters except when implementing specific search techniques."
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
      console.log(query, " in tool run")
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
      resolve(
        `Please intepret this JSON result to the customer in a markdown language output. ${JSON.stringify(
          response,
        )}`,
      );
    });
  }

  static async run(
    query: string,
  ): Promise<
    { title: string; author: string; publicationYear: number; url: string }[]
  > {
    return new Promise<
      { title: string; author: string; publicationYear: number; url: string }[]
    >(async (resolve, reject) => {
      const searchResults = await searchBooks(query, 2);
      //Get neccessary field
      const filteredSearchResult = searchResults.map((record) => {
        return {
          title: record.title,
          author: record.author,
          publicationYear: record.publicationYear,
          url: record.url,
        };
      });
      resolve(filteredSearchResult);
    });
  }
}

export { EBSCOBookSearchTool };

import { Tool } from "../ToolTemplates";
import { searchBooks } from "./utils/ebscoService";

class EBSCOBookSearchTool implements Tool {
  private static instance: EBSCOBookSearchTool;

  public name: string = "EBSCOBookSearchTool";
  public description: string =
    "This tool is for searching for list of books/articles suiting the input keywords, useful for suggesting books/article to customers. Keywords should be academic-related such as economics, pattern matching, DNA, Evolution, or compiler design, etc. The parameter will look like an EBSCO query";

  public parameters: { [parameterName: string]: string } = {
    query:
      "string [REQUIRED] [only includes EBSCO query as one parameter string \"{SU:Accounting}and{TI:math}\" or the like, don't include any commas, double quotes or quotes]",
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
        `Please intepret this JSON result to the customer in a human-readable way. If there is a link, write it out directly; do not include html tag. ${JSON.stringify(
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

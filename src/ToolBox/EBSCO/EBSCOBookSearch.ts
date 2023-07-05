import { Tool } from "../ToolTemplates";
import { searchBooks } from "./utils/ebscoService";

class EBSCOBookSearchTool implements Tool {
  private static instance: EBSCOBookSearchTool;

  public name: string = "EBSCOBookSearchTool";
  public description: string =
    "This tool is for searching for list of books/articles suiting the input keywords, useful for suggesting books/article to customers. Keywords should be academic-related such as economics, pattern matching, DNA, Evolution, or compiler design, etc. This tool has ONE parameter.";
  public parameters: { [parameterName: string]: string } = {
    query:
      "string [only includes keywords in this string, don't include any commas, double quotes or quotes]",
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

  async run(toolInput: { query: string }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const { query } = toolInput;
      const response = await EBSCOBookSearchTool.run(query);
      resolve(
        `Please intepret this JSON result to the customer in a human-readable way. If there is a link, write it out directly; do not include html tag. ${response}`
      );
    });
  }

  static async run(query: string) {
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
    return JSON.stringify(filteredSearchResult);
  }
}

export { EBSCOBookSearchTool };

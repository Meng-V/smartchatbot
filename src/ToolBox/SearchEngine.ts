import { customsearch, customsearch_v1 } from "@googleapis/customsearch";
import { Tool, ToolInput } from "./ToolTemplates";

type SearchResult = {
  index: number;
  link: string | null;
  content: string | null;
};

class SearchEngine implements Tool {
  private static instance: SearchEngine;
  public name: string = "GoogleCustomSearchEngine";
  public description: string =
    "This tool is for searching relevant general documents about King Library. This tool should be always the last solution you should consider if other tools are not appropriate for the task.";
  public parameters: { [parameterName: string]: string } = {
    query:
      "string [REQUIRED] [only includes keywords in this string, don't include any commas, double quotes or quotes, don't inlcude the word 'King Library' inside the parameter]",
  };

  private GOOGLE_API_KEY: string;
  private GOOGLE_CSE_ID: string;
  private searchEngine: customsearch_v1.Customsearch;

  private constructor() {
    try {
      this.GOOGLE_CSE_ID = process.env.GOOGLE_LIBRARY_SEARCH_CSE_ID!;
      this.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
    } catch (error: any) {
      throw new Error("Input key name does not exist in the PATH");
    }
    this.searchEngine = customsearch("v1");
    SearchEngine.instance = this;
  }

  public static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine();
    }
    return SearchEngine.instance;
  }

  async toolRun(toolInput: ToolInput): Promise<string> {
    const { query } = toolInput;
    return new Promise<string>(async (resolve, reject) => {
      if (
        query === null ||
        query === "null" ||
        query === undefined ||
        query === "undefined"
      ) {
        resolve("Input query not found. Please use a query");
        return;
      }
      const response = await SearchEngine.run(query);
      resolve(
        `Please also include the appropriate reference link. If there is a link, write it out directly; do not include html tag. Result: ${response}`,
      );
    });
  }

  static async run(query: string): Promise<SearchResult[]> {
    return new Promise<SearchResult[]>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("Request Time Out");
      }, 5000);

      const instance = SearchEngine.getInstance();
      const response = await instance.searchEngine.cse.list({
        auth: instance.GOOGLE_API_KEY,
        cx: instance.GOOGLE_CSE_ID,
        q: query,
        num: 1,
      });
      let searchResults: SearchResult[] = [];
      response.data.items?.forEach((item, idx) => {
        searchResults.push({
          index: idx,
          link: item.link!,
          content: item.pagemap
            ? item.pagemap.metatags[0]["og:description"]
            : item.snippet,
        });
      });

      resolve(searchResults);
    });
  }
}

export { SearchEngine };

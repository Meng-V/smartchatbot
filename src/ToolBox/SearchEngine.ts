import { customsearch, customsearch_v1 } from "@googleapis/customsearch";
import { Tool, ToolInput } from "./ToolTemplates";

type searchResult = {
    index: number,
    link: string | null;
    content: string | null;
}

class SearchEngine implements Tool{
  private static instance: SearchEngine;
  public name: string = "GoogleCustomSearchEngine"
  public description: string = "This tool is for search relevant general documents about King Library. This tool has ONE parameter. "
  public parameters: { [parameterName: string]: string; } = {query: "string [only includes keywords in this string, don't include any commas, double quotes or quotes, don't inlcude the word 'King Library' inside the parameter]"}

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
    SearchEngine.instance = this

  }

  public static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine();
    }
    return SearchEngine.instance;
  }

  async run(toolInput: ToolInput): Promise<string> {
    const {query} = toolInput;
    return new Promise<string>(async(resolve, reject) => {
      const response = await SearchEngine.run(query);
      resolve(response);
    })
  }

  static async run(query: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            reject("Request Time Out");
          }, 5000);
        
        const instance = SearchEngine.getInstance();
        const response = await instance.searchEngine.cse.list({
            auth: instance.GOOGLE_API_KEY,
            cx: instance.GOOGLE_CSE_ID,
            q: query,
            num: 2,
        });
        let searchResults: searchResult[] = [];
        response.data.items?.forEach((item, idx) => {
            searchResults.push({
                index: idx,
                link: item.link!,
                content: item.pagemap ? item.pagemap.metatags[0]['og:description'] : item.snippet 
            })
        })

        resolve(JSON.stringify(searchResults));
    })
  }


}

export {SearchEngine}
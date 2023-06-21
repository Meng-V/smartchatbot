import { customsearch, customsearch_v1 } from "@googleapis/customsearch";
import { Tool } from "./ToolTemplates";

type searchResult = {
    link: string | null;
    content: string | null;
}

class SearchEngine implements Tool{
  public name: string = "GoogleCustomSearchEngine"
  public description: string = "This tool is for search relevant general documents about King Library."
  public parameters: { [parameterName: string]: string; } = {keywords: "string"}

  private GOOGLE_API_KEY: string;
  private GOOGLE_CSE_ID: string;
  private searchEngine: customsearch_v1.Customsearch;

  constructor(searchEngineKeyName: string) {
    try {
      this.GOOGLE_CSE_ID = process.env[searchEngineKeyName]!;
      this.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
    } catch (error: any) {
      throw new Error("Input key name does not exist in the PATH");
    }
    this.searchEngine = customsearch("v1");
  }

  async run(keywords: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            reject("Request Time Out");
          }, 5000);

        const response = await this.searchEngine.cse.list({
            auth: this.GOOGLE_API_KEY,
            cx: this.GOOGLE_CSE_ID,
            q: keywords,
            num: 2,
        });
        let searchResults: searchResult[] = [];
        response.data.items?.forEach((item) => {
            searchResults.push({
                link: item.link!,
                content: item.pagemap ? item.pagemap.metatags[0]['og:description'] : item.snippet 
            })
        })

        resolve(JSON.stringify(searchResults));
    })
  }


}

export {SearchEngine}
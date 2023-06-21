import { customsearch, customsearch_v1 } from "@googleapis/customsearch";
import { execPath } from "process";

class SearchEngine {
  private readonly GOOGLE_API_KEY: string = process.env.GOOGLE_API_KEY;
  private GOOGLE_CSE_ID: string;
  private searchEngine: customsearch_v1.Customsearch;

  constructor(searchEngineKeyName: string) {
    try {
      this.GOOGLE_CSE_ID = process.env[searchEngineKeyName]!;
    } catch (error: any) {
      throw new Error("Input key name does not exist in the PATH");
    }
    this.searchEngine = customsearch("v1");
  }

  async search(query: string): Promise<string> {
    const response = await this.searchEngine.cse.list({
        auth: this.GOOGLE_API_KEY,
        cx: this.GOOGLE_CSE_ID,
        q: query,
        num: 2,
    });

    return response.data.;
  }
}

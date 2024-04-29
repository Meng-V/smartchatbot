import { customsearch, customsearch_v1 } from '@googleapis/customsearch';
import { Injectable } from '@nestjs/common';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

type SearchResult = {
  index: number;
  link: string | null;
  content: string | null;
};

@Injectable()
export class KingLibrarySiteSearchService {
  private searchEngine: customsearch_v1.Customsearch = customsearch('v1');
  private GOOGLE_API_KEY =
    this.retrieveEnvironmentVariablesService.retrieve<string>('GOOGLE_API_KEY');
  private GOOGLE_CSE_ID =
    this.retrieveEnvironmentVariablesService.retrieve<string>(
      'GOOGLE_LIBRARY_SEARCH_CSE_ID',
    );

  constructor(
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {}

  /**
   * Search with result related to King Library
   * @param query
   * @param returnedSearchResultNumber
   * @returns
   */
  public async search(
    query: string,
    returnedSearchResultNumber: number = 1,
  ): Promise<SearchResult[]> {
    const response = await this.searchEngine.cse.list({
      auth: this.GOOGLE_API_KEY,
      cx: this.GOOGLE_CSE_ID,
      q: query,
      num: returnedSearchResultNumber,
    });

    const searchResults: SearchResult[] = [];
    response.data.items?.forEach((item, idx) => {
      searchResults.push({
        index: idx,
        link: item.link!,
        content: item.pagemap
          ? item.pagemap.metatags[0]['og:description']
          : item.snippet,
      });
    });

    return searchResults;
  }
}

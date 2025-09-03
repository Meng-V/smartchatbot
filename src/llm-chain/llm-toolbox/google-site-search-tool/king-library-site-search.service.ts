import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { SearchResult } from './search-result.interface';

@Injectable()
export class KingLibrarySiteSearchService {
  private searchEngine = google.customsearch('v1');
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
    try {
      // Validate credentials before making API call
      if (!this.GOOGLE_API_KEY || !this.GOOGLE_CSE_ID) {
        throw new Error(
          'Missing Google API credentials: GOOGLE_API_KEY or GOOGLE_LIBRARY_SEARCH_CSE_ID',
        );
      }

      // Ensure num parameter is within valid range (1-10)
      const numResults = Math.min(Math.max(returnedSearchResultNumber, 1), 10);

      const response = await this.searchEngine.cse.list({
        key: this.GOOGLE_API_KEY,
        cx: this.GOOGLE_CSE_ID,
        q: query,
        num: numResults,
        // Add additional parameters for better results
        safe: 'off', // Include all results
        fields: 'items(title,link,snippet,pagemap/metatags)', // Only fetch needed fields
      });

      const searchResults: SearchResult[] = [];
      response.data.items?.forEach((item: any, idx: number) => {
        searchResults.push({
          index: idx,
          link: item.link || null,
          content: item.pagemap
            ? item.pagemap.metatags?.[0]?.['og:description'] ||
              item.snippet ||
              null
            : item.snippet || null,
        });
      });

      return searchResults;
    } catch (error: any) {
      // Enhanced error handling with specific error messages
      if (error.response?.status === 403) {
        throw new Error(
          `Google API 403 Forbidden: ${error.response.data?.error?.message || 'Access denied. Check API key, CSE ID, and billing setup.'}`,
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          `Google API 400 Bad Request: ${error.response.data?.error?.message || 'Invalid parameters'}`,
        );
      } else if (error.response?.status === 429) {
        // Return a helpful fallback instead of throwing error
        return [
          {
            index: 0,
            link: 'https://library.miamioh.edu',
            content:
              'I apologize, but the search service is temporarily unavailable due to quota limits. Please visit the Miami University Libraries website directly or contact a librarian for assistance.',
          },
        ];
      }

      throw new Error(`Google Search API error: ${error.message}`);
    }
  }
}

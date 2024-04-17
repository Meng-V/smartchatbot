import { customsearch, customsearch_v1 } from '@googleapis/customsearch';

import { Injectable } from '@nestjs/common';
import { LlmTool, LlmToolInput } from '../llm-tool.interface';
import { KingLibrarySiteSearchService } from './king-library-site-search.service';

@Injectable()
export class GoogleSiteSearchToolService implements LlmTool {
  public readonly toolName = 'GoogleSiteSearchEngine';
  public readonly toolDescription: string =
    'This tool is for searching relevant general documents specifically about King Library.This tool should be always the last solution you should consider if other tools are not appropriate for the task.';
  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      query:
        "string[REQUIRED][only includes keywords in this string, don't include any commas, double quotes or quotes, don't inlcude the word 'King Library' inside the parameter]",
    };

  /**
   * Number of search result this tool will explore with the input query
   */
  private RETURNED_SEARCH_RESULT_NUMBER = 1;

  constructor(
    private kingLibrarySiteSearchService: KingLibrarySiteSearchService,
  ) {}

  public async toolRunForLlm(llmToolInput: LlmToolInput): Promise<string> {
    if (
      llmToolInput.query === null ||
      llmToolInput.query === 'null' ||
      llmToolInput.query === undefined ||
      llmToolInput.query === 'undefined'
    )
      return "Cannot use the tool because parameter 'query' is missing. Ask the customer about this.";
    const searchResults = await this.kingLibrarySiteSearchService.search(
      llmToolInput.query,
      this.RETURNED_SEARCH_RESULT_NUMBER,
    );

    return `Answer with appropriate reference link.Search Result:${JSON.stringify(searchResults)}`;
  }
}

import { Test } from '@nestjs/testing';
import { GoogleSiteSearchToolService } from './google-site-search-tool.service';
import { KingLibrarySiteSearchService } from './king-library-site-search.service';

describe('GoogleSiteSearchToolService', () => {
  let service: GoogleSiteSearchToolService;
  let mockKingLibrarySiteSearchService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoogleSiteSearchToolService,
        {
          provide: KingLibrarySiteSearchService,
          useValue: mockKingLibrarySiteSearchService,
        },
      ],
    }).compile();

    service = module.get(GoogleSiteSearchToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should notify when empty parameters', async () => {
    const expectedResponse =
      "Cannot use the tool because parameter 'query' is missing. Ask the customer about this.";
    expect(await service.toolRunForLlm({ query: null })).toEqual(
      expectedResponse,
    );
    expect(await service.toolRunForLlm({ query: 'null' })).toEqual(
      expectedResponse,
    );
    expect(await service.toolRunForLlm({ query: undefined })).toEqual(
      expectedResponse,
    );
    expect(await service.toolRunForLlm({ query: 'undefined' })).toEqual(
      expectedResponse,
    );
  });

  it('should return a correct search result', async () => {
    const fakeGoogleSearchResult = [
      {
        index: 1,
        link: 'https://test-link.com',
        content: 'This is test result',
      },
    ];
    mockKingLibrarySiteSearchService.search.mockResolvedValue(
      fakeGoogleSearchResult,
    );

    expect(await service.toolRunForLlm({ query: 'test query' })).toEqual(
      `Answer with appropriate reference link.Search Result:${JSON.stringify(fakeGoogleSearchResult)}`,
    );
  });
});

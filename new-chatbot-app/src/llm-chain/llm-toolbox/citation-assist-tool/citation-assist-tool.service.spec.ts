import { Test, TestingModule } from '@nestjs/testing';
import {
  CitationAssistToolService,
  CitationType,
} from './citation-assist-tool.service';

describe('CitationAssistToolService', () => {
  let service: CitationAssistToolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CitationAssistToolService],
    }).compile();

    service = module.get<CitationAssistToolService>(CitationAssistToolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should run with proper input', async () => {
    //Test for MLAgetSystemErrorMap
    const toolInput = {
      citationType: 'MLA',
    };
    let expectedResponse = `Explain these links to the customer: ${JSON.stringify(
      {
        'General Reference': 'https://libguides.lib.miamioh.edu/citation/mla',
        'In-text Citations':
          'https://libguides.lib.miamioh.edu/citation/mla_in-text_citations',
        'Example Citations-Print':
          'https://libguides.lib.miamioh.edu/citation/mla_print-examples',
        'Example Citations-Online,Electronic':
          'https://libguides.lib.miamioh.edu/citation/ama_online',
        'Example Citations-Images,Video,Audio':
          'https://libguides.lib.miamioh.edu/citation/mla_multimedia-examples',
        'Example Citations-Business Database':
          'https://libguides.lib.miamioh.edu/citation/mla_business',
        Handbook: 'https://libguides.lib.miamioh.edu/citation/mla_business',
      },
    )}.Student can consider using CitationManager:Zotero,Mendeley,EndNote for ease.Read more:https://libguides.lib.miamioh.edu/CitationManagers.`;
    expect(await service.toolRunForLlm(toolInput)).toEqual(expectedResponse);

    //Test for Chicago styling
    toolInput.citationType = 'Chicago';
    expectedResponse = `Explain these links to the customer: ${JSON.stringify({
      'General Reference': 'https://libguides.lib.miamioh.edu/citation/chicago',
      'In-text Citations':
        'https://libguides.lib.miamioh.edu/citation/chicago_in-text_citations',
      'In-text Citations-AuthorDate':
        'https://libguides.lib.miamioh.edu/citation/chicago_in-text_author-date',
      'Example Citations-Print':
        'https://libguides.lib.miamioh.edu/citation/chicago_print-examples',
      'Example Citations-Online,Electronic':
        'https://libguides.lib.miamioh.edu/citation/chicago_electronic-examples',
      'Example Citations-Images,Video,Audio':
        'https://libguides.lib.miamioh.edu/citation/chicago_multimedia-examples',
    })}.Student can consider using CitationManager:Zotero,Mendeley,EndNote for ease.Read more:https://libguides.lib.miamioh.edu/CitationManagers.`;
    expect(await service.toolRunForLlm(toolInput)).toEqual(expectedResponse);
  });

  it('should return error message with improper input', async () => {
    //null and undefined toolInput
    let expectedResponse = `Cannot use this tool because missing paramter citationType.Ask the customer to provide this data.`;
    expect(
      await service.toolRunForLlm({
        citationType: null,
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        citationType: 'null',
      }),
    ).toEqual(expectedResponse);
    expect(
      await service.toolRunForLlm({
        citationType: 'undefined',
      }),
    ).toEqual(expectedResponse);

    //Invalid citation type
    expectedResponse = `Error:citationType must be one of ${Object.keys(CitationType)}`;
    expect(
      await service.toolRunForLlm({
        citationType: 'Invalid citation',
      }),
    ).toEqual(expectedResponse);
  });
});

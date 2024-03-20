import { Injectable } from '@nestjs/common';
import { LlmTool } from '../llm-tool.interface';

export enum CitationType {
  APA = 'APA',
  MLA = 'MLA',
  Chicago = 'Chicago',
  Turabian = 'Turabian',
  AMA = 'AMA',
}

type CitationReference = {
  'General Reference': string;
  'In-text Citations'?: string;
  'In-text Citations-AuthorDate'?: string;
  'Example Citations-Print'?: string;
  'Example Citations-Online,Electronic'?: string;
  'Example Citations-Images,Video,Audio'?: string;
  'Example Citations-Business Database'?: string;
  'Examples Citations-Audio Visual'?: string;
  'Reference Format'?: string;
  'Paper Format'?: string;
  Handbook?: string;
};

@Injectable()
export class CitationAssistToolService implements LlmTool {
  public readonly toolName: string = 'CitationAssistTool';
  public readonly toolDescription: string =
    'This tool is for providing resources for citation.Student can consider using CitationManager:Zotero,Mendeley,EndNote for ease.Read more:https://libguides.lib.miamioh.edu/CitationManagers';

  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      citationType: `string[REQUIRE][only choose among APA,MLA,Chicago,Turbian]`,
    };

  private quickLinkMapping: { [key in CitationType]: CitationReference } = {
    APA: {
      'General Reference': 'libguides.lib.miamioh.edu/citation/apa',
      'In-text Citations':
        'libguides.lib.miamioh.edu/citation/apa_in-text_citations',
      'Example Citations-Print':
        'libguides.lib.miamioh.edu/citation/apa_print-examples',
      'Example Citations-Online,Electronic':
        'libguides.lib.miamioh.edu/citation/apa_electronic-examples',
      'Example Citations-Images,Video,Audio':
        'libguides.lib.miamioh.edu/citation/apa_multimedia-examples',
      'Example Citations-Business Database':
        'libguides.lib.miamioh.edu/citation/apa_business-examples',
      'Paper Format': 'libguides.lib.miamioh.edu/c.php?g=320744&p=9188521',
    },
    MLA: {
      'General Reference': 'libguides.lib.miamioh.edu/citation/mla',
      'In-text Citations':
        'libguides.lib.miamioh.edu/citation/mla_in-text_citations',
      'Example Citations-Print':
        'libguides.lib.miamioh.edu/citation/mla_print-examples',
      'Example Citations-Online,Electronic':
        'libguides.lib.miamioh.edu/citation/ama_online',
      'Example Citations-Images,Video,Audio':
        'libguides.lib.miamioh.edu/citation/mla_multimedia-examples',
      'Example Citations-Business Database':
        'libguides.lib.miamioh.edu/citation/mla_business',
      Handbook: 'libguides.lib.miamioh.edu/citation/mla_business',
    },
    Chicago: {
      'General Reference': 'libguides.lib.miamioh.edu/citation/chicago',
      'In-text Citations':
        'libguides.lib.miamioh.edu/citation/chicago_in-text_citations',
      'In-text Citations-AuthorDate':
        'libguides.lib.miamioh.edu/citation/chicago_in-text_author-date',
      'Example Citations-Print':
        'libguides.lib.miamioh.edu/citation/chicago_print-examples',
      'Example Citations-Online,Electronic':
        'libguides.lib.miamioh.edu/citation/chicago_electronic-examples',
      'Example Citations-Images,Video,Audio':
        'libguides.lib.miamioh.edu/citation/chicago_multimedia-examples',
    },
    Turabian: {
      'General Reference': 'libguides.lib.miamioh.edu/citation/chicago',
      'In-text Citations':
        'libguides.lib.miamioh.edu/citation/chicago_in-text_citations',
      'In-text Citations-AuthorDate':
        'libguides.lib.miamioh.edu/citation/chicago_in-text_author-date',
      'Example Citations-Print':
        'libguides.lib.miamioh.edu/citation/chicago_print-examples',
      'Example Citations-Online,Electronic':
        'libguides.lib.miamioh.edu/citation/chicago_electronic-examples',
      'Example Citations-Images,Video,Audio':
        'libguides.lib.miamioh.edu/citation/chicago_multimedia-examples',
    },
    AMA: {
      'General Reference': 'libguides.lib.miamioh.edu/citation/ama',
      'In-text Citations':
        'libguides.lib.miamioh.edu/citation/chicago_in-text_citations',
      'In-text Citations-AuthorDate':
        'https://libguides.lib.miamioh.edu/citation/chicago_in-text_author-date',
      'Example Citations-Print':
        'libguides.lib.miamioh.edu/citation/chicago_print-examples',
      'Example Citations-Online,Electronic':
        'libguides.lib.miamioh.edu/citation/chicago_electronic-examples',
      'Example Citations-Images,Video,Audio':
        'libguides.lib.miamioh.edu/citation/chicago_multimedia-examples',
    },
  };

  constructor() {}

  /**
   * Check if the input citation type is valid.
   * @param citationType
   * @returns
   */
  private isValidCitationType(citationType: string): boolean {
    return Object.keys(CitationType).includes(citationType as CitationType);
  }

  public async toolRunForLlm(toolInput: {
    citationType: string | null | undefined;
  }): Promise<string> {
    if (
      toolInput.citationType === null ||
      toolInput.citationType === 'null' ||
      toolInput.citationType === undefined ||
      toolInput.citationType === 'undefined'
    ) {
      return `Cannot use this tool because missing paramter citationType.Ask the customer to provide this data.`;
    }

    if (!this.isValidCitationType(toolInput.citationType)) {
      return `Error:citationType must be one of ${Object.keys(CitationType)}`;
    }

    const citationType = toolInput.citationType as CitationType;
    const quickLinks = this.quickLinkMapping[citationType];

    return `Here're some quick links: ${JSON.stringify(quickLinks)}.Explain these links with the customer.`;
  }
}

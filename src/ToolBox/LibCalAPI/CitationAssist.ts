import { LibCalAPIBaseTool } from "./LibCalAPI";
import { RoomReservationTool } from "./RoomReservation";

enum CitationType {
  APA = "APA",
  MLA = "MLA",
  Chicago = "Chicago",
  Turabian = "Turabian",
  AMA = "AMA",
}

type CitationReference = {
  "General Reference": string;
  "In-text Citations"?: string;
  "In-text Citations-AuthorDate"?: string;
  "Example Citations-Print"?: string;
  "Example Citations-Online,Electronic"?: string;
  "Example Citations-Images,Video,Audio"?: string;
  "Example Citations-Business Database"?: string;
  "Examples Citations-Audio Visual"?: string;
  "Reference Format"?: string;
  "Paper Format"?: string;
  Handbook?: string;
};

class CitationAssistTool extends LibCalAPIBaseTool {
  private static instance: CitationAssistTool;

  public readonly name: string = "CitationAssistTool";
  public readonly description: string =
    "This tool is for assisting with citation instruction.";

  public readonly parameters: { [parameterName: string]: string } = {
    citationType: `string[REQUIRE][only choose among APA,MLA,Chicago,Turbian]`,
  };

  private quickLinkMapping: { [key in CitationType]: CitationReference } = {
    APA: {
      "General Reference": "libguides.lib.miamioh.edu/citation/apa",
      "In-text Citations":
        "libguides.lib.miamioh.edu/citation/apa_in-text_citations",
      "Example Citations-Print":
        "libguides.lib.miamioh.edu/citation/apa_print-examples",
      "Example Citations-Online,Electronic":
        "libguides.lib.miamioh.edu/citation/apa_electronic-examples",
      "Example Citations-Images,Video,Audio":
        "libguides.lib.miamioh.edu/citation/apa_multimedia-examples",
      "Example Citations-Business Database":
        "libguides.lib.miamioh.edu/citation/apa_business-examples",
      "Paper Format": "libguides.lib.miamioh.edu/c.php?g=320744&p=9188521",
    },
    MLA: {
      "General Reference": "libguides.lib.miamioh.edu/citation/mla",
      "In-text Citations":
        "libguides.lib.miamioh.edu/citation/mla_in-text_citations",
      "Example Citations-Print":
        "libguides.lib.miamioh.edu/citation/mla_print-examples",
      "Example Citations-Online,Electronic":
        "libguides.lib.miamioh.edu/citation/ama_online",
      "Example Citations-Images,Video,Audio":
        "libguides.lib.miamioh.edu/citation/mla_multimedia-examples",
      "Example Citations-Business Database":
        "libguides.lib.miamioh.edu/citation/mla_business",
      Handbook: "libguides.lib.miamioh.edu/citation/mla_business",
    },
    Chicago: {
      "General Reference": "libguides.lib.miamioh.edu/citation/chicago",
      "In-text Citations":
        "libguides.lib.miamioh.edu/citation/chicago_in-text_citations",
      "In-text Citations-AuthorDate":
        "libguides.lib.miamioh.edu/citation/chicago_in-text_author-date",
      "Example Citations-Print":
        "libguides.lib.miamioh.edu/citation/chicago_print-examples",
      "Example Citations-Online,Electronic":
        "libguides.lib.miamioh.edu/citation/chicago_electronic-examples",
      "Example Citations-Images,Video,Audio":
        "libguides.lib.miamioh.edu/citation/chicago_multimedia-examples",
    },
    Turabian: {
      "General Reference": "libguides.lib.miamioh.edu/citation/chicago",
      "In-text Citations":
        "libguides.lib.miamioh.edu/citation/chicago_in-text_citations",
      "In-text Citations-AuthorDate":
        "libguides.lib.miamioh.edu/citation/chicago_in-text_author-date",
      "Example Citations-Print":
        "libguides.lib.miamioh.edu/citation/chicago_print-examples",
      "Example Citations-Online,Electronic":
        "libguides.lib.miamioh.edu/citation/chicago_electronic-examples",
      "Example Citations-Images,Video,Audio":
        "libguides.lib.miamioh.edu/citation/chicago_multimedia-examples",
    },
    AMA: {
      "General Reference": "libguides.lib.miamioh.edu/citation/ama",
      "In-text Citations":
        "libguides.lib.miamioh.edu/citation/chicago_in-text_citations",
      "In-text Citations-AuthorDate":
        "https://libguides.lib.miamioh.edu/citation/chicago_in-text_author-date",
      "Example Citations-Print":
        "libguides.lib.miamioh.edu/citation/chicago_print-examples",
      "Example Citations-Online,Electronic":
        "libguides.lib.miamioh.edu/citation/chicago_electronic-examples",
      "Example Citations-Images,Video,Audio":
        "libguides.lib.miamioh.edu/citation/chicago_multimedia-examples",
    },
  };

  constructor() {
    super();
    CitationAssistTool.instance = this;
  }

  public static getInstance(): CitationAssistTool {
    if (!CitationAssistTool.instance) {
      CitationAssistTool.instance = new CitationAssistTool();
    }
    return CitationAssistTool.instance;
  }

  private isValidCitationType(citationType: string): boolean {
    return Object.keys(CitationType).includes(citationType as CitationType);
  }

  public async toolRun(toolInput: {
    citationType: string | null;
  }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (
        toolInput.citationType === null ||
        toolInput.citationType === "null"
      ) {
        resolve(
          `Cannot use this tool because missing paramter citationType.Ask the customer to provide this data.`
        );
        return;
      }
      if (!this.isValidCitationType(toolInput.citationType)) {
        resolve(
          `Error:citationType must be one of${Object.keys(CitationType)}`
        );
        return;
      }
      const citationType = toolInput.citationType as CitationType;

      const quickLinks = this.quickLinkMapping[citationType];

      resolve(`Here're some quick links: ${JSON.stringify(quickLinks)}`);
    });
  }
}

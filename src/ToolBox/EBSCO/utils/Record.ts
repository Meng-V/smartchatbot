interface Item {
  Name: string;
  Label: string;
  Group: string;
  Data: string;
  Abstract: string;
  Link: string;
}

interface Record {
  ResultId: number;
  Header: {
    DbId: string;
    DbLabel: string;
    An: string;
    RelevancyScore: number;
    PubType: string;
    PubTypeId: string;
  };
  PLink: string;
  ImageInfo: {
    CoverArt: [
      {
        Size: string;
        Target: string;
      },
      {
        Size: string;
        Target: string;
      },
    ];
  };
  Items: Item[];
  RecordInfo: {
    BibRecord: {
      BibEntity: {
        Languages: {
          Language: {
            Text: string;
          };
        };
        Subjects: {
          Subject: Array<{
            SubjectFull: string;
            Type: string;
          }>;
        };
        Titles: {
          Title: Title | Title[];
        };
      };
      BibRelationships: {
        HasContributorRelationships: {
          HasContributor: Array<{
            PersonEntity: {
              Name: {
                NameFull: string;
              };
            };
          }>;
        };
        IsPartOfRelationships: {
          IsPartOf: {
            BibEntity: {
              Dates: {
                Date: {
                  D: number;
                  M: number;
                  Type: string;
                  Y: number;
                };
              };
              Identifiers: {
                Identifier: Array<{
                  Type: string;
                  Value: number;
                }>;
              };
              Titles: {
                Title: Title | Title[];
              };
            };
          };
        };
      };
    };
  };
  Holdings: Holdings;
  IllustrationInfo: string;
}

interface CopyInformation {
  Sublocation: string;
  ShelfLocator: string;
}

interface HoldingSimple {
  CopyInformationList: {
    CopyInformation: CopyInformation[];
  };
}

interface Holding {
  HoldingSimple: HoldingSimple;
}

interface Holdings {
  Holding: Holding;
}
interface SearchResponse {
  SearchRequestGet: {
    QueryString: string;
    SearchCriteriaWithActions: {
      QueriesWithAction: Array<any>;
    };
  };
  SearchResult: {
    Statistics: {
      TotalHits: number;
      TotalSearchTime: number;
      Databases: Array<any>;
    };
    Data: {
      RecordFormat: string;
      Records: Array<Record>;
    };
    AvailableFacets: Array<any>;
    AvailableCriteria: {
      DateRange: any;
    };
  };
}
interface Title {
  TitleFull: string;
  Type: string;
}

interface DisplayRecord {
  title?: string;
  author?: string;
  publicationYear?: number;
  bookType?: string;
  subjects?: string;
  locationInformation?: { Sublocation?: string; ShelfLocator?: string }[];
  abstract?: string;
  url?: string;
  status?: string;
  error?: string;
  location?: string;
}

export {
  Record,
  SearchResponse,
  DisplayRecord,
  Item,
  Holdings,
  CopyInformation,
};

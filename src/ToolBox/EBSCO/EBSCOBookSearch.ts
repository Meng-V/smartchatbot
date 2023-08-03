import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { Tool } from "../ToolTemplates";
import { searchBooks } from "./utils/ebscoService";
import { Nodehun } from "nodehun";
import { DisplayRecord } from "./utils/Record";

const fs = require("fs");
const affix = fs.readFileSync("./src/dictionaries/en_us.aff");
const dictionary = fs.readFileSync("./src/dictionaries/en_us.dic");
const nodehun = new Nodehun(affix, dictionary);

class EBSCOBookSearchTool implements Tool {
  private static instance: EBSCOBookSearchTool;

  public name: string = "EBSCOBookSearchTool";

  // public description: string =
  //   "EBSCOBookSearchTool searches academic resources using an EBSCO query. The following codes are used to represent specific types of data: TX=All Text, AU=Author, TI=Title, SU=Subject, SO=Source, AB=Abstract, IS=ISSN [8-digit code], IB=ISBN [13 digits code]. Use logical operators such as AND/OR to combine search terms. Use proximity operators such as NEAR(N), WITHIN(W) to specify the closeness of terms. For a more precise search, use quotes for an exact phrase, * for a wildcard, ? for single character substitution, # for single/no character substitution.";

  // public parameters: { [parameterName: string]: string } = {
  //   query:
  //     "REQUIRED string. Use an EBSCO query format. For example, 'AU Gaiman AND TI Sandman'. Avoid using special characters except when implementing specific search techniques.",
  // };
  public description: string =
    "EBSCOBookSearchTool is designed to search academic resources using an EBSCO query. It works best when you input specific book titles in your query rather than referring to their order in a series. Utilize the following codes to target specific data types: TX=All Text, AU=Author, TI=Title, SU=Subject, SO=Source, AB=Abstract, IS=ISSN [8-digit code], IB=ISBN [13-digit code]. Combine search terms using logical operators like AND/OR. If the book title or any other search parameter is not certain, use proximity operators such as NEAR(N), WITHIN(W) to specify the closeness of terms. For a more precise search, apply quotes for an exact phrase, * for a wildcard, ? for single character substitution, and # for single/no character substitution.";

  public parameters: { [parameterName: string]: string } = {
    query:
      "REQUIRED string. Format your search in the EBSCO query style with specific book titles and fix very obvious spellings. For example, 'AU Neil Gaiman AND TI Sandman'. In case of uncertainty about book titles or if the query uses words such as like or something or other parameters, use proximity operators in the format 'TI BookTitle1 N# BookTitle2' where '#' is the number of words in between. Avoid using special characters except when implementing specific search techniques. When referring to books in a series, use the exact book titles instead of their numerical order.",
  };

  private constructor() {
    EBSCOBookSearchTool.instance = this;
  }

  public static getInstance(): EBSCOBookSearchTool {
    if (!EBSCOBookSearchTool.instance) {
      EBSCOBookSearchTool.instance = new EBSCOBookSearchTool();
    }
    return EBSCOBookSearchTool.instance;
  }

  async toolRun(toolInput: { query: string }): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const { query } = toolInput;
      console.log(query, " in tool run");
      if (
        query === null ||
        query === "null" ||
        query === undefined ||
        query === "undefined"
      ) {
        resolve("Input query not found. Please use a query");
        return;
      }
      const response = await EBSCOBookSearchTool.run(query);
      if (response.length === 0) {
        resolve("Sorry, no results were found for your query.");
      } else {
        resolve(
          `Please interpret the best two choice from this JSON result to the customer in a markdown language output, including if there's value in the error field. ${JSON.stringify(
            response,
          )}`,
        );
      }
    });
  }

  static async run(query: string): Promise<DisplayRecord[]> {
    return new Promise<DisplayRecord[]>(async (resolve) => {
      const searchResults = await searchBooks(query, 5);
      console.log("run method:", searchResults);
  
      if (searchResults.length === 0) {
        console.log("No results found for the given query");
        resolve([{ status: "fail", title: "", author: "", publicationYear: 0, url: "", location: "", error: "No results found for the given query" }]);
        return;
      }
  
      const filteredSearchResult = searchResults.map((record) => {
        let location = "";
        if (record.locationInformation) {
          for (const info of record.locationInformation) {
            location += `${info.Sublocation} - ${info.ShelfLocator}\n`;
          }
          location = location.trim();
        }
  
        return {
          title: record.title,
          author: record.author,
          publicationYear: record.publicationYear,
          url: record.url,
          location: location,
        };
      });
  
      resolve(filteredSearchResult);
    });
  }
  

  async correctSpelling(input: string): Promise<string> {
    const words = input.split(" ");
    for (let i = 0; i < words.length; i++) {
      const isCorrect = await nodehun.spell(words[i]);
      if (!isCorrect) {
        const suggestions = await nodehun.suggest(words[i]);
        if (suggestions && suggestions.length > 0) {
          let correctedWord = suggestions[0].toLowerCase(); // replace the incorrect word with the first suggestion in lowercase

          // Capitalize the corrected word only if the original was capitalized
          if (words[i].charAt(0) === words[i].charAt(0).toUpperCase()) {
            correctedWord =
              correctedWord.charAt(0).toUpperCase() + correctedWord.slice(1);
          }

          words[i] = correctedWord;
        }
      }
    }
    return words.join(" "); // return the corrected query
  }
}

export { EBSCOBookSearchTool };

import { Either, isLeft, left, right } from "fp-ts/lib/Either";
import * as dotenv from "dotenv";
import { performSearch } from "./accessEBSCOAPI";
import { endSession } from "./setupTokens";
import {
  SearchResponse,
  Record,
  DisplayRecord,
  Item,
  CopyInformation,
} from "./Record";
import { getEnvironmentVariables } from "./ebscoService";
const he = require("he");
import { JSDOM } from "jsdom";
import striptags from "striptags";
import {AuthSessionToken} from "./setupTokens";
import * as t from "io-ts";

function cleanHTMLTags(input: string): string {
  const dom = new JSDOM(input);
  const stripped = striptags(dom.window.document.body.textContent || "");
  return he.decode(stripped) || "";
}
dotenv.config();

/**
 * Extracts specific item data from a given list of items.
 *
 * @param items - A list of items from which data is to be extracted.
 * @param name - The name of the item data to extract.
 *
 * @returns The extracted data if it exists, 'Not available' otherwise.
 */
function extractItemData(items: Item[] | undefined, name: string): string {
  if (!Array.isArray(items) || items.length === 0) {
    return "Not available";
  }
  const item = items.find((i: Item) => i.Name === name);
  return item?.Data || "Not available";
}

/**
 * Extracts the publication year from a given list of items.
 *
 * @param items - A list of items from which the publication year is to be extracted.
 *
 * @returns The extracted publication year if it exists, NaN otherwise.
 */
function extractPublicationYear(items: Item[] | undefined): number {
  if (!Array.isArray(items) || items.length === 0) {
    return NaN;
  }

  const titleSource = extractItemData(items, "TitleSource");
  const publicationYearMatch = titleSource.match(/(\d{4})/);

  if (publicationYearMatch) {
    return Number(publicationYearMatch[1]);
  }

  return NaN;
}

/**
 * Extracts the subject from a given list of items.
 *
 * @param items - A list of items from which the subject is to be extracted.
 *
 * @returns The extracted subject if it exists, 'Not available' otherwise.
 */
function extractSubjects(items: Item[] | undefined): string {
  if (!Array.isArray(items) || items.length === 0) {
    return "Not available";
  }
  const subjectData = extractItemData(items, "Subject");
  return subjectData ? subjectData : "Not available";
}

/**
 * Transforms a record into a display record.
 *
 * @param record - The record to transform.
 *
 * @returns A promise that resolves with the transformed display record.
 */
function extractLocationInformation(
  record: Record | undefined,
): { Sublocation: string; ShelfLocator: string }[] {
  let locationInformation: CopyInformation[] = [];

  if (Array.isArray(record?.Holdings)) {
    const firstHolding = record?.Holdings[0];
    const copyInformationList = firstHolding?.HoldingSimple.CopyInformationList;
    if (Array.isArray(copyInformationList)) {
      locationInformation = copyInformationList;
    }
  }
  return locationInformation
    ? locationInformation
    : [{ Sublocation: "Not available", ShelfLocator: "Not available" }];
}
/**
 * Transforms a raw Record object into a more user-friendly DisplayRecord object.
 * It extracts the necessary data from the raw record using various helper functions.
 *
 * @param record - The raw Record object to be transformed.
 *
 * @returns A Promise that resolves to a DisplayRecord object.
 */
async function transformToDisplayRecord(
  record: Record,
): Promise<DisplayRecord> {
  const items = record?.Items?.map((item: any) => item) || [];
  const title = cleanHTMLTags(extractItemData(items, "Title"));
  const author = cleanHTMLTags(extractItemData(items, "Author"));
  const publicationYear = extractPublicationYear(items);
  const bookType = cleanHTMLTags(record.Header?.PubType || "Not available");
  const subjects = cleanHTMLTags(extractSubjects(items));
  const locationInformation = extractLocationInformation(record);
  const abstract = cleanHTMLTags(extractItemData(items, "Abstract"));
  const url = record.PLink;
  const displayRecord: DisplayRecord = {
    title,
    author,
    publicationYear,
    bookType,
    subjects,
    locationInformation,
    abstract,
    url,
  };
  return displayRecord;
}

/**
 * Main function for querying the Ebsco API. This function performs a search with
 * the given parameters and transforms the resulting records into DisplayRecord objects.
 * In case of any error during the process, it returns a Left<Error> object.
 *
 * @param query - The query string for the Ebsco API search.
 * @param sessionToken - The session token used for authenticating with the Ebsco API.
 * @param numOfBooks - The number of books to return from the search.
 *
 * @returns A Promise that resolves to an Either<Error, DisplayRecord[]> object.
 */
async function queryEbscoApi(
  query: string,
  tokens: t.TypeOf<typeof AuthSessionToken>,
  numOfBooks: number,
): Promise<Either<Error, DisplayRecord[]>> {
  const { userId, password, profile } = getEnvironmentVariables();

  const responseResult = await performSearch(tokens, query, numOfBooks);

  if (isLeft(responseResult)) {
    return responseResult;
  }

  const response: SearchResponse = responseResult.right;
  console.log(query)
  console.log(response)
  
  // Check if the 'Records' property exists in the response
  if (!response.SearchResult.Data.Records) {
    return left(new Error("The response from the API did not contain any records."));
  }

  // Check if the 'Records' array is empty
  if (response.SearchResult.Data.Records.length === 0) {
    return left(new Error("No records were found that match the provided query."));
  }

  const dataPromises = response.SearchResult.Data.Records.map(
    (record: Record) => {
      return transformToDisplayRecord(record);
    },
  );
  let data: DisplayRecord[] = [];

  try {
    data = await Promise.all(dataPromises);
  } catch (error) {
    if (error instanceof Error) {
      return left(error);
    } else {
      return left(new Error("An unknown error occurred."));
    }
  }
  await endSession(tokens);

  return right(data);
}

/**
 * Exposed function to search for a book using the Ebsco API. This function uses the
 * queryEbscoApi function and processes its result to either return the list of found books
 * or throw an error.
 *
 * @param query - The query string for the Ebsco API search.
 * @param sessionToken - The session token used for authenticating with the Ebsco API.
 * @param numOfBooks - The number of books to return from the search.
 *
 * @returns A Promise that resolves to an array of DisplayRecord objects if successful,
 *          or throws an Error if unsuccessful.
 */
export async function searchForBook(
  query: string,
  tokens: t.TypeOf<typeof AuthSessionToken>,
  numOfBooks: number,
): Promise<DisplayRecord[]> {
  try {
    const dataResult = await queryEbscoApi(query, tokens, numOfBooks);
    console.log("searchForBook method:", dataResult);

    if (isLeft(dataResult)) {
      console.error("Error querying the EBSCO API:", dataResult.left);
      return [{ status: "fail", error: `Error querying the EBSCO API: ${dataResult.left}` }];
    }

    var data: DisplayRecord[] = dataResult.right;
    data[0]['status'] = 'success';

    if (data.length > 0) {
      return data;
    } else {
      return [{ status: "fail", error: "No results found" }];
    }
  } catch (err) {
    console.error("An unexpected error occurred:", err);
    return [{ status: "fail", error: `An unexpected error occurred, please try again.` }];
  }
}
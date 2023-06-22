import { Configuration, OpenAIApi, CreateChatCompletionRequest } from "openai";
import { Either, isLeft, left, right } from 'fp-ts/lib/Either';
import * as dotenv from 'dotenv';
import { performSearch, endSession } from './accessEBSCOAPI';
import { SearchResponse, Record, DisplayRecord, Item, Holdings, CopyInformation } from './Record';
const he = require('he');


dotenv.config();

async function queryEbscoApi(query: string, sessionToken: string, numOfBooks: number): Promise<Either<Error, DisplayRecord[]>> {
  const userId = process.env.EBSCO_USER_ID ?? '';
  const password = process.env.EBSCO_USER_PASSWORD ?? '';
  const profile = process.env.EBSCO_USER_PROFILE ?? '';

  if (!userId || !password || !profile) {
    console.error('EBSCO_USER_ID or EBSCO_PASSWORD or EBSCO_USER_PROFILE environment variables are missing.');
  }

  const responseResult = await performSearch(sessionToken, query, numOfBooks);

  if (isLeft(responseResult)) {
    return responseResult;
  }

  const response: SearchResponse = responseResult.right;

  const dataPromises = response.SearchResult.Data.Records.map((record: Record) => {
    return transformToDisplayRecord(record);
  });
  let data: DisplayRecord[] = [];

  try {
    data = await Promise.all(dataPromises);
  } catch (error) {
    if (error instanceof Error) {
      return left(error);
    } else {
      return left(new Error('An unknown error occurred.'));
    }
  }
  await endSession(sessionToken);

  return right(data);
}
function extractLocationInformation(holdings: Holdings | undefined): { sublocation: string; shelfLocator: string }[] {
  if (!holdings?.Holding?.HoldingSimple?.CopyInformationList?.CopyInformation) {
    return [{ sublocation: 'Not available', shelfLocator: 'Not available' }];
  }

  return holdings.Holding.HoldingSimple.CopyInformationList.CopyInformation.map((info: CopyInformation) => ({
    sublocation: info.Sublocation || 'Not available',
    shelfLocator: info.ShelfLocator || 'Not available',
  }));
}
async function transformToDisplayRecord(record: Record): Promise<DisplayRecord> {
  const items = record?.Items?.map((item: any) => item) || [];
  const title = extractItemData(items, 'Title');
  const author = extractItemData(items, 'Author');
  const publicationYear = extractPublicationYear(items);
  const bookType = record.Header?.PubType || 'Not available';
  const subjects = extractSubjects(items);
  const locationInformation = extractLocationInformation(record.Holdings);
  const displayRecord : DisplayRecord = {
    title,
    author,
    publicationYear,
    bookType,
    subjects,
    locationInformation,
  };
  console.log(displayRecord.locationInformation)
  return displayRecord;
}


function extractItemData(items: Item[] | undefined, name: string): string {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Not available';
  }

  const item = items.find((i: Item) => i.Name === name);
  return item?.Data || 'Not available';
}

function extractPublicationYear(items: Item[] | undefined): number {
  if (!Array.isArray(items) || items.length === 0) {
    return NaN;
  }

  const titleSource = extractItemData(items, 'TitleSource');
  const publicationYearMatch = titleSource.match(/(\d{4})/);

  if (publicationYearMatch) {
    return Number(publicationYearMatch[1]);
  }

  return NaN;
}

function extractSubjects(items: Item[] | undefined): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return ['Not available'];
  }

  const subjectData = extractItemData(items, 'Subject');
  return subjectData ? subjectData.split('<br />') : ['Not available'];
}

async function main(): Promise<void> {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
  const openai = new OpenAIApi(configuration);

  const chatCompletionRequest: CreateChatCompletionRequest = {
    model: "gpt-4",
    messages: [{ role: "user", content: "I have an EBSCO API that I need to process to a chatbot that gives back information about book/journal title and library call number location, how do I write ts code for accessing the API and getting the necessary information back." }],
  };

  // try {
  //   const res = await searchForBook("Harry Potter");
  //   console.log(res);
  // } catch (error) {
  //   console.error("Error:", error);
  // }
}

export async function searchForBook(query: string, sessionToken: string, numOfBooks: number): Promise<DisplayRecord[]> {
  const dataResult = await queryEbscoApi(query, sessionToken, numOfBooks);
  if (isLeft(dataResult)) {
    console.error('Error querying the EBSCO API:', dataResult.left);
    throw new Error('No results found due to an error.');
  }

  const data: DisplayRecord[] = dataResult.right;

  if (data.length > 0) {
    return data;
  } else {
    throw new Error('No results found');
  }
}


main().catch((error) => {
  console.error("Error:", error);
});

// function stripHtmlTagsAndDecode(input: string): string {
//   // Decode HTML entities
//   // let decodedInput = he.decode(input);

//   // // Use regular expression to extract words from the decoded string
//   // let regex = />([^<]+)</g;

//   // // Extract words
//   // let words = decodedInput.match(regex);
//   // return words ? words.map((item: string) => item.replace('>', '').replace('<', '')).join("; ") : '';
//   return he.decode(input.replace(/<\/?[^>]+(>|$)/g, ""));
// }

// function cleanData(data: DisplayRecord): DisplayRecord | PromiseLike<DisplayRecord> {
//   return {
//     title: stripHtmlTagsAndDecode(data.title),
//     author: stripHtmlTagsAndDecode(data.author),
//     publicationYear: data.publicationYear,
//     bookType: data.bookType,
//     subjects: data.subjects.map(stripHtmlTagsAndDecode),
//     locationInformation: data.locationInformation  // Assuming locationInformation doesn't need cleaning
//   };
// }

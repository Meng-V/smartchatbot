import { setupTokens } from "./setupTokens";
import { searchForBook } from "./ebscoSearch";
import { isLeft } from "fp-ts/lib/Either";
import * as dotenv from "dotenv";
import { DisplayRecord } from "./Record";
import {AuthSessionToken} from "./setupTokens";
import * as t from "io-ts";

dotenv.config();

// Helper function to retrieve and validate the necessary environment variables
function getEnvironmentVariables(): {
  userId: string;
  password: string;
  profile: string;
} {
  const userId = process.env.EBSCO_USER_ID ?? "";
  const password = process.env.EBSCO_USER_PASSWORD ?? "";
  const profile = process.env.EBSCO_USER_PROFILE ?? "";

  if (!userId || !password || !profile) {
    throw new Error(
      "EBSCO_USER_ID or EBSCO_PASSWORD or EBSCO_USER_PROFILE environment variables are missing. Make a copy of the .env.sample and make a file .env, then fill in those variables values.",
    );
  }

  return { userId, password, profile };
}

async function authenticateUser(): Promise<t.TypeOf<typeof AuthSessionToken>> {
  const { userId, password, profile } = getEnvironmentVariables();

  if (!userId || !password || !profile) {
    throw new Error(
      "EBSCO_USER_ID or EBSCO_PASSWORD or EBSCO_USER_PROFILE environment variables are missing. Make a copy of the .env.sample and make a file .env, then fill in those variables values.",
    );
  }

  const tokenResults = await setupTokens(userId, password, profile);
  if (isLeft(tokenResults)) {
    throw new Error("Failed to set up tokens: " + tokenResults.left);
  }

  return tokenResults.right;
}

async function searchBooks(
  query: string,
  numOfBooks: number,
): Promise<DisplayRecord[]> {
  const tokens  = await authenticateUser();
  const bookInfo = await searchForBook(query, tokens, numOfBooks);
  console.log("searchBooks method:" , bookInfo);
  return bookInfo;
}

export { searchBooks, getEnvironmentVariables };

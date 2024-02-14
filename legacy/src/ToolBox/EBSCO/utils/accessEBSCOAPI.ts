import axios, { AxiosError } from "axios";
import { Either, left, right } from "fp-ts/lib/Either";
import { SearchResponse } from "./Record";
import { getHeaders } from "./setupTokens";
import * as dotenv from "dotenv";
import {AuthSessionToken} from "./setupTokens";
import * as t from "io-ts";

dotenv.config();

export async function performSearch(
  tokens: t.TypeOf<typeof AuthSessionToken>,
  query: string,
  numOfBooks: number,
): Promise<Either<Error, SearchResponse>> {
  const url = `${process.env.SEARCH_URL}${encodeURIComponent(
    query,
  )}&resultsperpage=${numOfBooks}&view=detailed`;
  
  console.log(url);
  
  try {
    const response = await axios.get<SearchResponse>(url, {
      headers: getHeaders(tokens.SessionToken, tokens.AuthenticationToken),
    });

    return right(response.data);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error during search:", axiosError.response?.data);
    return left(
      new Error(
        "Failed to perform search: " + (axiosError.message || "Unknown error"),
      ),
    );
  }
}
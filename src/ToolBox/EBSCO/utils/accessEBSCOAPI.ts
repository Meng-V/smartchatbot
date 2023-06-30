import axios, { AxiosError } from 'axios';
import { Either, left, right } from 'fp-ts/lib/Either';
import { SearchResponse } from './Record';
import { getHeaders } from './setupTokens';
import * as dotenv from 'dotenv';
dotenv.config();

export async function performSearch(sessionToken: string, query: string, numOfBooks: number): Promise<Either<Error, SearchResponse>> {
  const url = `${process.env.SEARCH_URL},${encodeURIComponent(query)}&resultsperpage=${numOfBooks}&view=detailed`;
  try {
    const response = await axios.get<SearchResponse>(url, {
      headers: getHeaders(sessionToken),
    });

    return right(response.data);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error during search:', axiosError.response?.data);
    return left(new Error('Failed to perform search: ' + (axiosError.message || 'Unknown error')));
  }
}
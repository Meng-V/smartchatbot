import axios, { AxiosError } from 'axios';
import { Either, left, right } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { SearchResponse } from './Record';
const SEARCH_URL = 'http://eds-api.ebscohost.com/edsapi/rest/Search?query-1=AND';
const END_SESSION_URL = 'http://eds-api.ebscohost.com/edsapi/rest/endsession';


export async function performSearch(sessionToken: string, query: string, numOfBooks: number): Promise<Either<Error, SearchResponse>> {
  const url = `${SEARCH_URL},${encodeURIComponent(query)}&resultsperpage=${numOfBooks}`;
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

export async function endSession(sessionToken: string): Promise<Either<Error, void>> {
  try {
    await axios.post(END_SESSION_URL, null, {
      headers: getHeaders(sessionToken),
    });

    return right(undefined);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error ending session:', axiosError.response?.data);
    return left(new Error('Failed to end session: ' + (axiosError.message || 'Unknown error')));
  }
}

function getHeaders(sessionToken: string): Record<string, string> {
  return {
    'x-sessionToken': sessionToken,
  };
}

import { setupTokens } from './setupTokens';
import { searchForBook } from './ebsco';
import { isLeft } from 'fp-ts/lib/Either';
import * as dotenv from 'dotenv';

dotenv.config();

async function authenticateUser(): Promise<string> {
    const userId = process.env.EBSCO_USER_ID ?? '';
    const password = process.env.EBSCO_USER_PASSWORD ?? '';
    const profile = process.env.EBSCO_USER_PROFILE ?? '';

    if (!userId || !password || !profile) {
        throw new Error('EBSCO_USER_ID or EBSCO_PASSWORD or EBSCO_USER_PROFILE environment variables are missing.');
    }

    const sessionTokenResult = await setupTokens(userId, password, profile);
    if (isLeft(sessionTokenResult)) {
        throw new Error('Failed to set up tokens: ' + sessionTokenResult.left);
    }

    return sessionTokenResult.right;
}

async function searchBooks(query: string, numOfBooks: number): Promise<any> {
    const sessionToken = await authenticateUser();
    const bookInfo = await searchForBook(query, sessionToken, numOfBooks);
    return bookInfo;
}

export { searchBooks };
import { setupTokens } from './setupTokens';
import { searchForBook } from './ebsco';
import { isLeft } from 'fp-ts/lib/Either';
import { fold } from 'fp-ts/lib/Either';
import * as dotenv from 'dotenv';

dotenv.config();
async function main(): Promise<void> {
    const userId = process.env.EBSCO_USER_ID ?? '';
    const password = process.env.EBSCO_USER_PASSWORD ?? '';
    const profile = process.env.EBSCO_USER_PROFILE ?? '';
    if (!userId || !password || !profile) {
      console.error('EBSCO_USER_ID or EBSCO_PASSWORD or EBSCO_USER_PROFILE environment variables are missing.');
      return;
    }
  
    const query = 'Harry Potter'; //test query
    const numOfBooks = 2;
    setupTokens(userId, password, profile)
    .then((sessionTokenResult) => {
        if (isLeft(sessionTokenResult)) {
            console.error('Failed to set up tokens:', sessionTokenResult.left);
        } else {
            const sessionToken = sessionTokenResult.right;
            searchForBook(query, sessionToken, numOfBooks)
                .then((bookInfo) => {
                    console.log('Book Information:');
                    // console.log(bookInfo);
                })
                .catch((error) => console.error('An error occurred:', error));
        }
    })
    .catch((error) => console.error('An error occurred:', error));
  }
  
  main().catch((error) => {
    console.error('An error occurred:', error);
  });
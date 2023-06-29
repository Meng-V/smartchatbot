// import { Configuration, OpenAIApi } from "openai";
// import * as dotenv from 'dotenv';

// dotenv.config();

// /**
//  * Calls the OpenAI API to generate a chat completion.
//  * @param configuration - The OpenAI configuration object.
//  * @param prompt - The user prompt for the chat completion. Defaults to an empty string.
//  * @returns The chat completion response.
//  */
// async function generateChatCompletion(configuration: Configuration, prompt = ''): Promise<any> {
//   const openai = new OpenAIApi(configuration);
//   const today = new Date();

//   const chatCompletion = await openai.createChatCompletion({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: prompt || `A student is looking to book a study room Room 213 at King Library from 3-5pm next Tuesday, today is ${today}. Using all of this return back a JSON output with the intent that is study room reservation, the library name, room number, exact date and time, duration` }],
//   });

//   return chatCompletion;
// }


// /**
//  * Parses the JSON part from the content string.
//  * @param content - The content string containing JSON data.
//  * @returns The parsed JSON object.
//  * @throws Error if there's an error parsing the JSON.
//  */
// function parseJSONFromContent(content: string | undefined): any {
//   if (!content) {
//     throw new Error("Content is undefined or empty");
//   }

//   try {
//     const jsonString = content.replace(/'/g, '') // Remove single quotes
//       .replace(/\+/g, '') // Remove "+" signs
//       .replace(/\n\s*/g, '') // Remove newlines and spaces
//       .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"').toString(); // Keep double quotes for property names and values

//     const data = JSON.parse(jsonString);
//     return data;
//   } catch (error) {
//     throw new Error("Error parsing JSON: " + (error as Error).message);
//   }
// }

// /**
//  * Main function to run the OpenAI chat completion and JSON parsing.
//  */
// async function main(): Promise<void> {
//   try {
//     const configuration = new Configuration({
//       apiKey: process.env.OPENAI_API_KEY || '',
//     });

//     const chatCompletion = await generateChatCompletion(configuration);
//     const content = chatCompletion?.data?.choices[0]?.message?.content;

//     console.log("Original content:", content);

//     const data = parseJSONFromContent(content);
//     console.log("Parsed JSON data:", data);
//   } catch (error) {
//     console.error("An error occurred:", error);
//   }
// }

// // Run the main function
// main().catch((error) => {
//   console.error("An error occurred:", error);
// });

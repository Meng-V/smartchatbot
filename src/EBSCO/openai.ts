
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv';

dotenv.config();
/*
 * Main function to run OPEN AI 
 */
async function main(): Promise<void> {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
  const openai = new OpenAIApi(configuration);
  var today = new Date();
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: `A student is looking to book a study room at King Library from 3-5pm next Tuesday, today is ${today}. Using all of this return back a JSON output with the intent that is study room reservation, the library name, exact date and time, duration` }],
  });
  const content = chatCompletion?.data?.choices[0]?.message?.content;

  console.log("Original content:", content);

  try {
    const jsonString = content?.replace(/'/g, '') // Remove single quotes
      .replace(/\+/g, '') // Remove "+" signs
      .replace(/\n\s*/g, '') // Remove newlines and spaces
      .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"').toString(); // Keep double quotes for property names and values

    console.log("Modified JSON string:", jsonString);
    const data = JSON.parse(jsonString || "");
    console.log("Parsed JSON data:", data);
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
}

main().catch((error) => {
  console.error("An error occurred:", error);
});

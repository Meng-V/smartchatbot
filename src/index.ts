import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels";
import { ConversationMemory } from "./Memory/ConversationMemory";
import { CheckRoomAvailabilityTool } from "./ToolBox/LibCalAPI/CheckRoomAvailability";
import { RoomReservationTool } from "./ToolBox/LibCalAPI/RoomReservation";

import { searchBooks } from "./ToolBox/EBSCO/utils/ebscoService";

import { SearchEngine } from "./ToolBox/SearchEngine";

import * as readline from "readline";
import { CheckOpenHourTool } from "./ToolBox/LibCalAPI/CheckOpenHours";
import { EBSCOBookSearchTool } from "./ToolBox/EBSCO/EBSCOBookSearch";
import { CancelReservationTool } from "./ToolBox/LibCalAPI/CancelReservation";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function getUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const llmModel = new OpenAIModel();
  const memory = new ConversationMemory(8, llmModel, 2, 50, 3);

  memory.addToConversation("Customer", "Hi, I am Steve Do");
  memory.addToConversation("AIAgent", "Hi, how can I help you today?");
  memory.addToConversation("Customer", "what time do you guys open tommorow?");
  console.log(await memory.getConversationAsString(0,0,true));
  memory.addToConversation("AIAgent", "We would open from 8am to 10pm");
  console.log(await memory.getConversationAsString(0,0,true));

  memory.addToConversation("Customer", "Also, which librarian would be responsible for COmputer Science?");
  memory.addToConversation("AIAgent", "You can contact John Myers with email johmeyer@miamioh.edu. You can also reach him by 513-777-1010");
  console.log(await memory.getConversationAsString(0,0,true));

  memory.addToConversation("Customer", "Awesome, can you also tell me if study room 2001 is available tomorrow morning from 8-10?");
  memory.addToConversation("AIAgent", "Unfortunately, it's not available for that time range");
  memory.addToConversation("Customer", "What about from 11am to 12pm?");
  console.log(await memory.getConversationAsString(0,0,true));

  memory.addToConversation("AIAgent", "Yes, it is!");
  memory.addToConversation("Customer", "Can I book it with email donm@miamoh.edu?")
  console.log(await memory.getConversationAsString(0,0,true));

  memory.addToConversation("AIAgent", "Your room is booked with confirmation number of z13rt. A conmfirmation email was sent to your email.")
  console.log(await memory.getConversationAsString(0,0,true));

  memory.addToConversation("Customer", "Awesome. Can you also recommend me some books on Economics.")
  console.log(await memory.getConversationAsString(0,0,true));
  memory.addToConversation("AIAgent", "Sure. We do have books Microeconomics by Michael B Jordan and Currency by Jack Grealish.")
  console.log(await memory.getConversationAsString(0,0,true));
  memory.addToConversation("Customer", "Where can I get those books?")
  console.log(await memory.getConversationAsString(0,0,true));
  memory.addToConversation("AIAgent", "You can come to the library and ask the front desk or call 513-111-6900.")
  memory.addToConversation("Customer", "Thank you.")
  console.log(await memory.getConversationAsString(0,0,true));
}
main();

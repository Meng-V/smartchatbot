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
  const memory = new ConversationMemory()

  const searchTool = SearchEngine.getInstance();
  const reservationTool = RoomReservationTool.getInstance();
  const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
  const ebscoBookSearchTool = EBSCOBookSearchTool.getInstance();
  const checkOpenHourTool = CheckOpenHourTool.getInstance();

  const agent = new Agent(
    llmModel,
    [searchTool, reservationTool, checkRoomAvailabilityTool, ebscoBookSearchTool, checkOpenHourTool],
    memory,
  )
  let message = await getUserInput("User: ");
  while (message !== "stop") {
    const response = await agent.agentRun(message);
    console.log("AIAgent:", response);
    message = await getUserInput("User: ");
  }
}
main();

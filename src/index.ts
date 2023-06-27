// import { Agent } from "./Agent/Agent";
// import { OpenAIModel } from "./LLM/LLMModels"
// import { ConversationMemory } from "./Memory/ConversationMemory";
// import { HumanAssist } from "./ToolBox/HumanAssist";
// import { CheckRoomAvailabilityTool } from "./ToolBox/LibCalAPI/CheckRoomAvailability";
// import { RoomReservationTool } from "./ToolBox/LibCalAPI/RoomReservation";

// import { SearchEngine } from "./ToolBox/SearchEngine";

// import * as readline from 'readline';

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// function getUserInput(prompt: string): Promise<string> {
//   return new Promise((resolve) => {
//     rl.question(prompt, (answer) => {
//       resolve(answer);
//     });
//   });
// }

// async function main() {
//   const llmModel = new OpenAIModel();
//   const memory = new ConversationMemory()

//   const searchTool = SearchEngine.getInstance();
//   const reservationTool = RoomReservationTool.getInstance();
//   const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
//   // const humanAssistTool = HumanAssist.getInstance();

//   const agent = new Agent(
//     llmModel,
//     [searchTool, reservationTool, checkRoomAvailabilityTool],
//     memory,
//   )
//   let message = await getUserInput("User: ");
//   while (message !== "stop") {
//     const response = await agent.agentRun(message);
//     console.log("AIAgent:", response);
//     message = await getUserInput("User: ");
//   }

//   // console.log(await reservationTool.getAvailableHours("130596", "2023-06-28"));
// }
// main()

const date1 = new Date('August 19, 1975 23:15:30 GMT+07:00');
const date2 = new Date('August 19, 1975 23:15:30 GMT-02:00');

console.log(date1.getTimezoneOffset());
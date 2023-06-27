import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels"
import { ConversationMemory } from "./Memory/ConversationMemory";
import { HumanAssist } from "./ToolBox/HumanAssist";
import { LibCalAPI } from "./ToolBox/LibCalAPI";
import { SearchEngine } from "./ToolBox/SearchEngine";

import * as readline from 'readline';

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
  const reservationTool = LibCalAPI.getInstance();
  // const humanAssistTool = HumanAssist.getInstance();

  const agent = new Agent(
    llmModel,
    [searchTool, reservationTool],
    memory,
  )
  let message = await getUserInput("User: ");
  while (message !== "stop") {
    const response = await agent.agentRun(message);
    console.log("AIAgent:", response);
    message = await getUserInput("User: ");
  }
}
main()
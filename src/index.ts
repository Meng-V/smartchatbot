import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels"
import { ConversationMemory } from "./Memory/ConversationMemory";
import { LibCalAPI } from "./ToolBox/LibCalAPI";
import { SearchEngine } from "./ToolBox/SearchEngine";

async function main() {
  const llmModel = new OpenAIModel();
  const memory = new ConversationMemory()

  const searchTool = SearchEngine.getInstance();
  const reservationTool = LibCalAPI.getInstance();

  const agent = new Agent(
    llmModel,
    [searchTool, reservationTool],
    memory,
  )

  const respone = await agent.agentRun("Hi, my name is Nhut Do with email: donm@miamioh.edu. Can you book me a study room with room ID 130595 from 11AM to 12:30PM on Friday June 23?");
  console.log(respone);
}

main()
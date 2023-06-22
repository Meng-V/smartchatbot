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

  const respone = await agent.agentRun("Hi, my name is Nhut Do with email: donm@miamioh.edu. Can you book me a study room with room ID 130627 from 11:30AM to 1:30PM on June 29, 2023? After that, can you tell me what software can I download from King?");
  console.log(respone);
}
main()
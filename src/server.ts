import express, { Request, Response } from 'express';
import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels"
import { ConversationMemory } from "./Memory/ConversationMemory";
import { HumanAssist } from "./ToolBox/HumanAssist";
import { LibCalAPI } from "./ToolBox/LibCalAPI";
import { SearchEngine } from "./ToolBox/SearchEngine";

const app = express();

app.use(express.json());

app.post('/chat', async (req: Request, res: Response) => {
  const userInput = req.body?.text;

  if (!userInput) {
    return res.status(400).json({ error: 'Missing text in the request body' });
  }
  
  const llmModel = new OpenAIModel();
  const memory = new ConversationMemory()

  const searchTool = SearchEngine.getInstance();
  const reservationTool = LibCalAPI.getInstance();
  const humanAssistTool = HumanAssist.getInstance();

  const agent = new Agent(
    llmModel,
    [searchTool, reservationTool, humanAssistTool],
    memory,
  )

  try {
    const response = await agent.agentRun(userInput);
    return res.json({ message: response });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

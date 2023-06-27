import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels";
import { ConversationMemory } from "./Memory/ConversationMemory";
import { LibCalAPI } from "./ToolBox/LibCalAPI";
import { SearchEngine } from "./ToolBox/SearchEngine";

const app = express();
app.use(bodyParser.json());

const llmModel = new OpenAIModel();
const memory = new ConversationMemory();
const searchTool = SearchEngine.getInstance();
const reservationTool = LibCalAPI.getInstance();

const agent = new Agent(
  llmModel,
  [searchTool, reservationTool],
  memory,
);

app.post('/chatbot', async (req, res) => {
  const userMessage = req.body.message;
  const response = await agent.agentRun(userMessage);
  res.json({ agentResponse: response });
});

app.listen(3000, () => {
  console.log('Server is up and running on port 3000');
});

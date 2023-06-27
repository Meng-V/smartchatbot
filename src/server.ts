import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from './Agent/Agent';
import { OpenAIModel } from './LLM/LLMModels';
import { ConversationMemory } from './Memory/ConversationMemory';
import { HumanAssist } from './ToolBox/HumanAssist';
import { LibCalAPI } from './ToolBox/LibCalAPI';
import { SearchEngine } from './ToolBox/SearchEngine';

const app = express();

app.use(bodyParser.json());

// Initialize the AI agent
const llmModel = new OpenAIModel();
const memory = new ConversationMemory();
const searchTool = SearchEngine.getInstance();
const reservationTool = LibCalAPI.getInstance();
// const humanAssistTool = HumanAssist.getInstance();

const agent = new Agent(
  llmModel,
  [searchTool, reservationTool],
  memory,
);

app.post('/chatbot', async (req, res) => {
  const userMessage = req.body.message;

  if (typeof userMessage === 'string') {
    const response = await agent.agentRun(userMessage);
    return res.json({ response });
  } else {
    return res.status(400).json({ error: 'Invalid request. "message" should be a string.' });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import { Agent } from './Agent/Agent';
import { OpenAIModel } from './LLM/LLMModels';
import { ConversationMemory } from './Memory/ConversationMemory';
import { HumanAssist } from './ToolBox/HumanAssist';
import { LibCalAPI } from './ToolBox/LibCalAPI';
import { SearchEngine } from './ToolBox/SearchEngine';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Configure as per your needs
  },
});

app.use(bodyParser.json());

// Initialize the AI agent
const llmModel = new OpenAIModel();
const memory = new ConversationMemory();
const searchTool = SearchEngine.getInstance();
const reservationTool = LibCalAPI.getInstance();

const agent = new Agent(
  llmModel,
  [searchTool, reservationTool],
  memory,
);

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('sendMessage', async (message, callback) => {
    try {
      const response = await agent.agentRun(message);
      socket.emit('message', response);
      callback();
    } catch (error) {
      console.error(error);
      callback('Error: Unable to connect to the chatbot');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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
import helmet from 'helmet';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Configure as per your needs
  },
});
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use(bodyParser.json());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "default-src": ["'self'", "http://localhost:3000"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "http://localhost:3000"],
      "connect-src": ["'self'", "http://localhost:3000"]
    },
  },
}));


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
      console.log(message);
      const response = await agent.agentRun(message);
      console.log(response)
      socket.emit('message', response);
      callback();
    } catch (error) {
      console.error(error);
      callback('Error: Unable to connect to the chatbot');
    }
  });

  socket.on('disconnect', () => {
    socket.emit('disconnected', 'User disconnected....');
    console.log('User disconnected');
  });
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

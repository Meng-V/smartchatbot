import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels";
import { ConversationMemory } from "./Memory/ConversationMemory";
import { CheckRoomAvailabilityTool } from "./ToolBox/LibCalAPI/CheckRoomAvailability";
import { RoomReservationTool } from "./ToolBox/LibCalAPI/RoomReservation";
import { SearchEngine } from "./ToolBox/SearchEngine";
import helmet from 'helmet';
import session from "express-session";
import { EBSCOBookSearchTool } from "./ToolBox/EBSCO/EBSCOBookSearch";
import { CheckOpenHourTool } from "./ToolBox/LibCalAPI/CheckOpenHours";
import { CancelReservationTool } from "./ToolBox/LibCalAPI/CancelReservation";
import * as dotenv from 'dotenv';
dotenv.config();

const PORT=process.env.PORT
const URL=`http://localhost:${PORT}`

const sessionMiddleware = session({
  secret: "changeit",
  resave: false,
  saveUninitialized: false
});
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Configure as per your needs
  },
});
// app.use(session({
//   secret: '34SDgsdgspsadfasfgddfsG', // just a long random string
//   resave: false,
//   saveUninitialized: true
// }));
app.use(express.static('public'));
app.use(express.static(__dirname));
app.use(bodyParser.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "default-src": ["'self'", URL],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", URL],
        "connect-src": ["'self'", URL],
      },
    },
  })
);

// Initialize the AI agent
const llmModel = new OpenAIModel();
const memory = new ConversationMemory();
const searchTool = SearchEngine.getInstance();
const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
const reservationTool = RoomReservationTool.getInstance();
const cancelReservationTool = CancelReservationTool.getInstance();
const ebscoBookSearchTool = EBSCOBookSearchTool.getInstance();
const checkOpenHourTool = CheckOpenHourTool.getInstance();

const agent = new Agent(
  llmModel,
  [
    searchTool,
    reservationTool,
    cancelReservationTool,
    checkRoomAvailabilityTool,
    ebscoBookSearchTool,
    checkOpenHourTool,
  ],
  memory
);


io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  let cookie = socket.handshake.headers.cookie || '';
  console.log("New user connected");

  socket.on("message", async (message, callback) => {
    try {
      console.log(message);
      const response = await agent.agentRun(message, cookie);
      console.log(response);
      socket.emit("message", response);
      callback("successful");
    } catch (error) {
      console.error(error);
      callback("Error: Unable to connect to the chatbot");
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

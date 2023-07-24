import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";

import prisma from "../prisma/prisma";
import { Agent } from "./Agent/Agent";
import { OpenAIModel } from "./LLM/LLMModels";
import { ConversationMemory } from "./Memory/ConversationMemory";
import { CheckRoomAvailabilityTool } from "./ToolBox/LibCalAPI/CheckRoomAvailability";
import { RoomReservationTool } from "./ToolBox/LibCalAPI/RoomReservation";
import { SearchEngine } from "./ToolBox/SearchEngine";
import helmet from "helmet";
import session from "express-session";
import { EBSCOBookSearchTool } from "./ToolBox/EBSCO/EBSCOBookSearch";
import { CheckOpenHourTool } from "./ToolBox/LibCalAPI/CheckOpenHours";
import { CancelReservationTool } from "./ToolBox/LibCalAPI/CancelReservation";
import { LibrarianSubjectSearchTool } from "./ToolBox/LibrarianSubject";

const PORT = 3001;

const sessionMiddleware = session({
  secret: "changeit",
  resave: false,
  saveUninitialized: false,
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
app.use(express.static("public"));
app.use(express.static(__dirname));
app.use(bodyParser.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "default-src": ["'self'", "http://localhost:3000"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "http://localhost:3000"],
        "connect-src": ["'self'", "http://localhost:3000"],
      },
    },
  })
);

// Initialize the AI agent
const llmModel = new OpenAIModel();
const memory = new ConversationMemory(8, llmModel, 2, 50, 3);
const searchTool = SearchEngine.getInstance();
const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
const reservationTool = RoomReservationTool.getInstance();
const cancelReservationTool = CancelReservationTool.getInstance();
const ebscoBookSearchTool = EBSCOBookSearchTool.getInstance();
const checkOpenHourTool = CheckOpenHourTool.getInstance();
const searchLibrarianWithSubjectTool = LibrarianSubjectSearchTool.getInstance();

const agent = new Agent(
  llmModel,
  [
    checkOpenHourTool,
    reservationTool,
    cancelReservationTool,
    checkRoomAvailabilityTool,
    ebscoBookSearchTool,
    searchLibrarianWithSubjectTool,
    searchTool,
  ],
  memory
);

io.engine.use(sessionMiddleware);

io.on("connection", async (socket) => {
  let cookie = socket.handshake.headers.cookie || "";
  console.log("New user connected");
  const userAgent = socket.request.headers["user-agent"]
    ? socket.request.headers["user-agent"]
    : null;
  let conversation = await prisma.conversation.create({
    data: {
      userAgent: userAgent,
      toolUsed: [],
    },
  });

  let toolsUsed: Set<string> = new Set();

  socket.on("sendMessage", async (message, callback) => {
    try {
      await prisma.message.create({
        data: {
          type: "customer",
          content: message,
          conversationId: conversation.id,
        },
      });
      const response = await agent.agentRun(message, cookie);

      await prisma.message.create({
        data: {
          type: "AIAgent",
          content: response.response.join("\n"),
          conversationId: conversation.id,
        },
      });
      socket.emit("message", response);

      response.actions.forEach((action) => {
        toolsUsed.add(action);
      });

      callback("successful");
    } catch (error) {
      console.error(error);
      callback("Error: Unable to connect to the chatbot");
    }
  });

  socket.on("disconnect", async () => {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        toolUsed: [...toolsUsed],
      },
    });
    console.log("User disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

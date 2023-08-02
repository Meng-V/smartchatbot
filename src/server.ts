import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import * as fs from "fs";

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
import { CentralCoordinator } from "./Agent/CentralCoordinator";

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

io.engine.use(sessionMiddleware);

const classifyExampleJSONString = fs.readFileSync(
  "classify_example.json",
  "utf-8"
);
const classifyExample = JSON.parse(classifyExampleJSONString);

io.on("connection", async (socket) => {
  // Initialize the AI agent
  const gpt3_5Model = OpenAIModel.getInstance("gpt-3.5-turbo");
  const gpt4Model = OpenAIModel.getInstance("gpt-4-0613");
  const memory = new ConversationMemory(8, gpt3_5Model, 1, 50, 3);
  const searchTool = SearchEngine.getInstance();
  const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
  const reservationTool = RoomReservationTool.getInstance();
  const cancelReservationTool = CancelReservationTool.getInstance();
  const ebscoBookSearchTool = EBSCOBookSearchTool.getInstance();
  const checkOpenHourTool = CheckOpenHourTool.getInstance();
  const searchLibrarianWithSubjectTool =
    LibrarianSubjectSearchTool.getInstance();

  const academicSupportAgent = new Agent(
    "AcademicSupportAgent",
    gpt4Model,
    [ebscoBookSearchTool, searchLibrarianWithSubjectTool,],
    memory
  );

  const roomReservationAgent = new Agent(
    "RoomReservationAgent",
    gpt4Model,
    [reservationTool, cancelReservationTool, checkRoomAvailabilityTool,],
    memory
  );

  const buildingInformationAgent = new Agent(
    "BuildingInformationAgent",
    gpt4Model,
    [checkOpenHourTool,],
    memory
  );

  const googleSearchAgent = new Agent(
    "GoogleSearchAgent",
    gpt4Model,
    [searchTool],
    memory
  );

  const generalPurposeAgent = new Agent(
    "GeneralPurposeAgent",
    gpt4Model,
    [
      ebscoBookSearchTool,
      searchLibrarianWithSubjectTool,
      reservationTool,
      cancelReservationTool,
      checkRoomAvailabilityTool,
      checkOpenHourTool,
      searchTool,
    ],
    memory
  );

  const smallTalkAgent = new Agent(
    "SmallTalkAgent",
    gpt3_5Model,
    [ebscoBookSearchTool,
      searchLibrarianWithSubjectTool,
      reservationTool,
      cancelReservationTool,
      checkRoomAvailabilityTool,
      checkOpenHourTool,
      searchTool,],
    memory,
    false,
  )

  //Initialize the Central Coordinator to coordinate the agent
  const centralCoordinator = new CentralCoordinator(
    memory,
    generalPurposeAgent,
    [academicSupportAgent, roomReservationAgent, buildingInformationAgent,
    googleSearchAgent, smallTalkAgent,
    ],
    0.91,
  );

  for (let agentName of Object.keys(classifyExample)) {
    centralCoordinator.addAgent(agentName, classifyExample[agentName]);
  }

  //For logging conversation data
  let cookie = socket.handshake.headers.cookie || "";
  console.log("New user connected");
  const userAgent = socket.request.headers["user-agent"]
    ? socket.request.headers["user-agent"]
    : null;
  let conversation = await prisma.conversation.create({
    data: {
      userAgent: userAgent,
      toolUsed: [],
      completionTokens: 0,
      promptTokens: 0,
      totalTokens: 0,
    },
  });

  socket.on("message", async (userMessage, callback) => {
    try {
      await prisma.message.create({
        data: {
          type: "customer",
          content: userMessage,
          conversationId: conversation.id,
        },
      });
      memory.addToConversation("Customer", userMessage);
      const agent = await centralCoordinator.coordinateAgent(userMessage);
      console.log(`Coordinate to agent ${agent.name}`);
      const agentResponse = await agent.agentRun(userMessage);

      await prisma.message.create({
        data: {
          type: "AIAgent",
          content: agentResponse.response.join("\n"),
          conversationId: conversation.id,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          completionTokens: {
            increment: agentResponse.tokenUsage.completionTokens,
          },
          promptTokens: {
            increment: agentResponse.tokenUsage.promptTokens,
          },
          totalTokens: {
            increment: agentResponse.tokenUsage.totalTokens,
          },
        },
      });
      socket.emit("message", agentResponse);

      agentResponse.actions.forEach(async (action) => {
        const existingTool = await prisma.conversation.findUnique({
          where: { id: conversation.id },
          select: { toolUsed: true },
        });

        if (!existingTool) {
          throw new Error("Entry not found");
        }
        const { toolUsed } = existingTool;
        if (!toolUsed.some((value) => value === action)) {
          // If not, add the new value to the toolUsed array
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { toolUsed: [...toolUsed, action] },
          });
        }
      });

      callback("successful");
    } catch (error) {
      console.error(error);
      callback("Error: Unable to connect to the chatbot");
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

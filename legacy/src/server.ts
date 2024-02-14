import express from "express"; // Express server
import { createServer } from "http"; // HTTP server
import { Server } from "socket.io"; // Socket.io server
import bodyParser from "body-parser"; // Body parser for Express to parse JSON body
import * as fs from "fs"; // File system
import prisma from "../prisma/prisma"; // Prisma ORM

import { Agent } from "./Agent/Agent";
import { CentralCoordinator } from "./Agent/CentralCoordinator";
import { AgentResponse } from "./Agent/IAgent";

import { OpenAIModel } from "./LLM/LLMModels";

import { ConversationMemory } from "./Memory/ConversationMemory";

import { CheckRoomAvailabilityTool } from "./ToolBox/LibCalAPI/CheckRoomAvailability";
import { RoomReservationTool } from "./ToolBox/LibCalAPI/RoomReservation";
import { CheckOpenHourTool } from "./ToolBox/LibCalAPI/CheckOpenHours";
import { CancelReservationTool } from "./ToolBox/LibCalAPI/CancelReservation";
import { SearchEngine } from "./ToolBox/SearchEngine";
import { EBSCOBookSearchTool } from "./ToolBox/EBSCO/EBSCOBookSearch";
import { LibrarianSubjectSearchTool } from "./ToolBox/LibrarianSubject";
import CitationAssistTool from "./ToolBox/LibCalAPI/CitationAssist";

import helmet from "helmet"; // Helmet for security
import session from "express-session"; // Express session for socket.io
import * as dotenv from "dotenv"; // Dotenv for environment variables
import axios from "axios"; // Axios for HTTP requests
import qs from "qs"; // qs for query string parsing

// Load environment variables
dotenv.config();

// Set up the server
const PORT = process.env.BACKEND_PORT;
if (PORT === undefined) {
  console.error("Error: PORT is undefined in the .env file");
}
const URL = `http://localhost:${PORT}`;

// Create a new session middleware
const sessionMiddleware = session({
  secret: "changeit", // Change it to your own secret
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
});

// Set up the Express server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Configure as per your needs
  },
});

app.use(express.static("public")); // Serve the static files from the public folder
app.use(express.static(__dirname)); // Serve the static files from the root directory
app.use(bodyParser.json());

// Set up the helmet middleware
// This is to prevent the browser from blocking the socket.io connection
app.use(
  helmet({
    // Configure with customed Content Security Policy
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Use the default directives
        "default-src": ["'self'", "http://localhost:3000"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "http://localhost:3000"],
        "connect-src": ["'self'", "http://localhost:3000"],
      },
    },
  })
);

// Then, add session middleware to Socket server
io.engine.use(sessionMiddleware);

// Read the classify example JSON file synchronously and parse it
const classifyExampleJSONString = fs.readFileSync(
  "classify_example.json",
  "utf-8"
);
const classifyExample = JSON.parse(classifyExampleJSONString);

// Socket.io connection
io.on("connection", async (socket) => {
  // Initialize the AI agent
  const gpt3_5Model = OpenAIModel.getInstance("gpt-3.5-turbo");
  const gpt4Model = OpenAIModel.getInstance("gpt-4-0613");
  // Initialize the conversation memory
  // Max context window is 8, using GPT3.5 model, conversation buffer size is 1,
  // conversation token limit is 50, minimum time between summarizations is 3
  const memory = new ConversationMemory(8, gpt3_5Model, 1, 50, 3);
  const searchTool = SearchEngine.getInstance();
  const checkRoomAvailabilityTool = CheckRoomAvailabilityTool.getInstance();
  const reservationTool = RoomReservationTool.getInstance();
  const cancelReservationTool = CancelReservationTool.getInstance();
  const ebscoBookSearchTool = EBSCOBookSearchTool.getInstance();
  const checkOpenHourTool = CheckOpenHourTool.getInstance();
  const searchLibrarianWithSubjectTool =
    LibrarianSubjectSearchTool.getInstance();
  const citationAssistTool = CitationAssistTool.getInstance();

  //------------------------------------------------------------------------------------------------------------------//
  //-------------------------------------------- Initialize the AI AGENTS --------------------------------------------//
  //------------------------------------------------------------------------------------------------------------------//

  /**
   * The agent that handles academic support questions (e.g., book search, librarian search)
   *
   * @type {Agent}
   * @property {string} name The name of the agent
   * @property {OpenAIModel} model The OpenAI model used by the agent
   * @property {Tool[]} tools The tools used by the agent
   * @property {ConversationMemory} memory The conversation memory used by the agent
   */
  const academicSupportAgent = new Agent(
    "AcademicSupportAgent",
    gpt4Model,
    [ebscoBookSearchTool, searchLibrarianWithSubjectTool, citationAssistTool],
    memory
  );

  /**
   * The agent that handles room reservation questions (e.g., check room availability, reserve room, cancel reservation)
   *
   * @type {Agent}
   * @property {string} name The name of the agent
   * @property {OpenAIModel} model The OpenAI model used by the agent
   * @property {Tool[]} tools The tools used by the agent
   * @property {ConversationMemory} memory The conversation memory used by the agent
   */
  const roomReservationAgent = new Agent(
    "RoomReservationAgent",
    gpt4Model,
    [reservationTool, cancelReservationTool, checkRoomAvailabilityTool],
    memory
  );

  /**
   * The agent that handles building information questions (e.g., check open hours)
   *
   * @type {Agent}
   * @property {string} name The name of the agent
   * @property {OpenAIModel} model The OpenAI model used by the agent
   * @property {Tool[]} tools The tools used by the agent
   * @property {ConversationMemory} memory The conversation memory used by the agent
   */
  const buildingInformationAgent = new Agent(
    "BuildingInformationAgent",
    gpt4Model,
    [checkOpenHourTool],
    memory
  );

  // const googleSearchAgent = new Agent(
  //   "GoogleSearchAgent",
  //   gpt4Model,
  //   [searchTool],
  //   memory
  // );

  /**
   * The general purpose agent that handles general questions
   *
   * @type {Agent}
   * @property {string} name The name of the agent
   * @property {OpenAIModel} model The OpenAI model used by the agent
   * @property {Tool[]} tools The tools used by the agent
   * @property {ConversationMemory} memory The conversation memory used by the agent
   */
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

  /**
   * Initialize the Central Coordinator to coordinate the agent
   * The default agent is the general purpose agent
   * @type {CentralCoordinator}
   * @property {ConversationMemory} memory The conversation memory used by the central coordinator
   * @property {Agent} defaultAgent The default agent used by the central coordinator
   * @property {agents[]} agents The agents used by the central coordinator
   * @property {number} confidenceThreshold The confidence threshold used by the central coordinator
   */
  const centralCoordinator = new CentralCoordinator(
    memory,
    generalPurposeAgent,
    [
      academicSupportAgent,
      roomReservationAgent,
      buildingInformationAgent,
      // googleSearchAgent,
    ],
    0.91
  );

  for (let agentName of centralCoordinator.getAgentNameIterable()) {
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

  ///////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////// MAIN COMMUNICATION CHANNEL  ///////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // When the user sends a message
  socket.on("message", async (userMessage, callback) => {
    try {
      // Initialize the user message associated with the conversation
      await prisma.message.create({
        data: {
          type: "customer",
          content: userMessage,
          conversationId: conversation.id,
        },
      });
      // Add the user message to the conversation memory
      memory.addToConversation("Customer", userMessage);
      // Coordinate the agent to determine which AI agent should respond based on
      // the current conversation context
      const agent = await centralCoordinator.coordinateAgent();
      console.log(`Coordinate to agent ${agent.name}`);
      let agentResponse: AgentResponse;
      try {
        // Generate a response from the agent which contains:
        // 1. The response from the agent
        // 2. The token usage information
        agentResponse = await agent.agentRun(userMessage);
        memory.addToConversation("AIAgent", agentResponse.response.join("\n"));
      } catch (error: any) {
        console.error(error);
        return;
      }

      await prisma.message.create({
        data: {
          type: "AIAgent",
          content: agentResponse.response.join("\n"),
          conversationId: conversation.id,
        },
      });
      // Update the conversation database with the token usage information
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
      // Allow the client to receive the agent's response in real-time.
      socket.emit("message", agentResponse);

      // Add the tools used by the agent to let the client know which tools are used
      agentResponse.actions.forEach(async (action) => {
        const existingTool = await prisma.conversation.findUnique({
          where: { id: conversation.id },
          select: { toolUsed: true },
        });
        // Check if the tool is already in the toolUsed array
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

  // When the user disconnects
  socket.on("disconnect", async () => {
    console.log("User disconnected");
  });

  // When the user sends a createTicket event
  socket.on("createTicket", async (ticketData, callback) => {
    try {
      // Get the user's personal information
      const { question, email, details, name, ip } = ticketData;

      // Authenticate with the LibAnswers API
      const authResponse = await axios.post(
        "https://libanswers.lib.miamioh.edu/api/1.1/oauth/token",
        {
          client_id: process.env.LIB_ANS_CLIENT_ID, // use your actual client_id and client_secret
          client_secret: process.env.LIB_ANS_CLIENT_SECRET,
          grant_type: "client_credentials",
        }
      );
      const { access_token } = authResponse.data;

      // Use the access token to authenticate the 'createTicket' request
      const data = qs.stringify({
        quid: process.env.QUEUE_ID, // use the actual queue id
        pquestion: question,
        pdetails: details,
        pname: name,
        pemail: email,
        ip,
        confirm_email: "true",
        // Add other fields as needed, e.g., custom1, custom2 etc.
      });

      // Send the request to create the ticket
      const ticketResponse = await axios.post(
        "https://libanswers.lib.miamioh.edu/api/1.1/ticket/create",
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      console.log(ticketResponse);

      callback("Ticket created successfully");
    } catch (error) {
      console.error(error);
      callback("Error: Unable to create ticket");
    }
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

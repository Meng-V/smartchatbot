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
import * as dotenv from 'dotenv';
import axios from "axios";
import qs from "qs";
dotenv.config();

const PORT=process.env.BACKEND_PORT
const URL=`http://localhost:${PORT}`

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
const memory = new ConversationMemory(10);
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

io.on("connection", async (socket) => {
  let cookie = socket.handshake.headers.cookie || "";
  console.log("New user connected");
  socket.emit("connected", "User connected");
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

  

  socket.on("message", async (message, callback) => {
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


  socket.on("createTicket", async (ticketData, callback) => {
    try {
      const { question, email, details, name, ip } = ticketData;
  
      const authResponse = await axios.post("https://libanswers.lib.miamioh.edu/api/1.1/oauth/token", {
        client_id: process.env.LIB_ANS_CLIENT_ID, // use your actual client_id and client_secret
        client_secret: process.env.LIB_ANS_CLIENT_SECRET,
        grant_type: "client_credentials",
      });
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
  
      const ticketResponse = await axios.post("https://libanswers.lib.miamioh.edu/api/1.1/ticket/create", data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${access_token}`,
        },
      });
  
      console.log(ticketResponse);
  
      callback("Ticket created successfully");
  
    } catch (error) {
      console.error(error);
      callback("Error: Unable to create ticket");
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

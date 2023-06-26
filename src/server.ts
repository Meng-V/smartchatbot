import express, { Request, Response } from 'express';
import { DaVinciAgent } from './LLM/OpenAIAgent';
import { ConversationMemory } from './Memory/ConversationMemory';
import { PromptAnalyzeInformation, PromptSelectingTool, ToolDocumentation } from './Prompt/Prompts';

const app = express();

app.get('/', (req, res) => {
    // Add your existing code here
    const tool1 = {
      name: "tool1",
      description: "helpful for math",
      parameters: {
        param1: "string",
        param2: "string[]",
        param3: "number[]",
      },
      returnType: "string[]",
    };
    const tool2 = {
      name: "tool2",
      description: "helpful for physics",
      parameters: {
        param1: "string",
        param2: "string[]",
        param3: "number[]",
      },
      returnType: "string",
    };
  
    let conversationMemory = new ConversationMemory();
    conversationMemory.addToConversation("Customer", "Hi");
    conversationMemory.addToConversation("Customer", "How are you?");
    conversationMemory.addToConversation("AIAgent", "Good. How can I help you?");
  
    let prompt1 = new PromptSelectingTool("You are a helpful assistant", [tool1, tool2], conversationMemory);
  
    let prompt2 = new PromptAnalyzeInformation("You are a helpful assistant", conversationMemory);
    prompt2.setContext("Hey yeasir");
  
    console.log(prompt1.getWholePrompt());
    console.log(prompt2.getWholePrompt());
  
    // Return a response to the user
    res.json({ message: "Workflow completed" });
  });
  

app.use(express.json());

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

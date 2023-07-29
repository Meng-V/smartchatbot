import { ConversationMemory } from "../Memory/ConversationMemory";
import { IAgent } from "./IAgent";
import cohere from "cohere-ai";

/**
 * This class would  coordinate the conversation to the appropriate expert agent. It would use Cohere Classify API to classify the conversation's most recent topic by pre-defined example
 */
class CentralCoordinator {
  private labelToAgent: Map<string, IAgent>;
  private exampleToLabel: { text: string; label: string }[];
  private conversationMemory: ConversationMemory;
  private modelName: string = "embed-english-light-v2.0";
  /**
   * Construct CentralCoordinator
   * @param conversationMemory
   */
  constructor(conversationMemory: ConversationMemory) {
    this.conversationMemory = conversationMemory;
    this.labelToAgent = new Map<string, IAgent>();
    this.exampleToLabel = [];
    const COHERE_API_KEY = process.env["COHERE_API_KEY"]!;
    cohere.init(COHERE_API_KEY);
  }

  addAgent(agent: IAgent, examples: string[]) {
    this.labelToAgent.set(agent.name, agent);
    examples.forEach((example) => {
      this.exampleToLabel.push({ text: example, label: agent.name });
    });
  }

  async classify(message: string): Promise<IAgent> {
    return new Promise<IAgent>(async (resolve, reject) => {
      const response = await cohere.classify({
        model: this.modelName,
        inputs: [message],
        examples: this.exampleToLabel,
      });

      if (!re)
    });
  }
}

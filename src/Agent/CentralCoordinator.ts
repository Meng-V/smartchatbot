import { reject } from "lodash";
import { ConversationMemory } from "../Memory/ConversationMemory";
import { IAgent } from "./IAgent";
import cohere from "cohere-ai";
import { start } from "repl";

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

  /**
   * This function return the match score of the input message with the current agent
   * @param message
   * @returns IAgent The agent that is most suited for the input message
   */
  async classify(message: string): Promise<Map<IAgent, number>> {
    return new Promise<Map<IAgent, number>>(async (resolve, reject) => {
      const response = await cohere.classify({
        model: this.modelName,
        inputs: [message],
        examples: this.exampleToLabel,
      });

      if (!response.body || !response.body.classifications) {
        reject("Error connecting to Cohere API");
        return;
      }

      const agentPredictionScores: Map<IAgent, number> = new Map<
        IAgent,
        number
      >();
      for (let agentName of Object.keys(
        response.body.classifications[0].labels
      )) {
        agentPredictionScores.set(
          this.labelToAgent.get(agentName)!,
          response.body.classifications[0].labels[agentName].confidence
        );
      }

      resolve(agentPredictionScores);
    });
  }

  async coordinateAgent(message: string): Promise<IAgent> {
    return new Promise<IAgent>(async (resolve, reject) => {
      const maximumContextWindow = 6;
      let bestAgent: IAgent;
      for (let startIdx=-1; startIdx >= -maximumContextWindow; startIdx--) {
        const conversationString = (await this.conversationMemory.getConversationAsString(startIdx, -1, false)).conversationString;

        const agentPredictionScores = this.classify(conversationString);

        const agentPredictionScoresArray = Array.from((await agentPredictionScores).entries());

        agentPredictionScoresArray.sort((a,b) => b[1] - a[1]);
        bestAgent = agentPredictionScoresArray[0][0];

        //Compare two highest prediction scores
        const threshold = 0.1;
        if (Math.abs(agentPredictionScoresArray[0][1] - agentPredictionScoresArray[1][1]) > threshold) {
          break;
        }
      };

      resolve(bestAgent!);
    });
  }
}

export { CentralCoordinator };

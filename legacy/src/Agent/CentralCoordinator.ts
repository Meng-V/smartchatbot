import { ConversationMemory } from "../Memory/ConversationMemory";
import { IAgent } from "./IAgent";
import cohere from "cohere-ai";
import { retryWithMaxAttempts } from "../Utils/NetworkUtils";
import axios, { AxiosResponse } from "axios";
import { classifyResponse, cohereResponse } from "cohere-ai/dist/models";

/**
 * CentralCoordinator would  coordinate the conversation to the appropriate expert agent. It would use Cohere Classify API to classify the conversation's most recent topic by pre-defined example
 */
class CentralCoordinator {
  private labelToAgent: Map<string, IAgent>;
  private exampleToLabel: { text: string; label: string }[];
  private conversationMemory: ConversationMemory;
  private modelName: string = "embed-english-v2.0";
  private defaultAgent: IAgent;
  private confidenceThreshold: number;
  /**
   * Construct CentralCoordinator
   * @param conversationMemory
   */
  constructor(
    conversationMemory: ConversationMemory,
    defaultAgent: IAgent,
    agents: IAgent[],
    confidenceThreshold: number = 0.85
  ) {
    this.conversationMemory = conversationMemory;
    this.labelToAgent = new Map<string, IAgent>();  // Map from agent name to agent
    this.exampleToLabel = [];
    const COHERE_API_KEY = process.env["COHERE_API_KEY"]!;
    cohere.init(COHERE_API_KEY);  // Initialize Cohere API

    this.defaultAgent = defaultAgent;
    for (let agent of agents) {
      this.labelToAgent.set(agent.name, agent);
    }

    this.confidenceThreshold = confidenceThreshold;
  }

  addAgent(agentName: string, examples: string[]) {
    if (!this.labelToAgent.has(agentName)) {
      throw new Error(`Does not exist agent with name ${agentName}`);
    }
    examples.forEach((example) => {
      this.exampleToLabel.push({ text: example, label: agentName });
    });
  }

  getAgentNameIterable(): IterableIterator<string> {
    return this.labelToAgent.keys();
  }

  /**
   * This function return the match score of the input message with the current agent
   * @param message
   * @returns IAgent The agent that is most suited for the input message
   */
  async classify(message: string): Promise<Map<IAgent, number>> {
    return new Promise<Map<IAgent, number>>(async (resolve, reject) => {
      let response;
      try {
        // Retry with max attempts to prevent network error
        response = await retryWithMaxAttempts<cohereResponse<classifyResponse>>(
          (): Promise<cohereResponse<classifyResponse>> => {
            return new Promise<cohereResponse<classifyResponse>>(
              async (resolve, reject) => {
                try {
                  // Classify the message to the appropriate agent for response
                  const axiosResponse = await cohere.classify({
                    model: this.modelName,
                    inputs: [message],
                    examples: this.exampleToLabel,
                  });
                  resolve(axiosResponse); // Return the response
                } catch (error: any) {
                  reject(error);
                }
              }
            );
          }
        );
      } catch (error: any) {
        reject(error);
        return;
      }

      // Catch error
      if (!response.body || !response.body.classifications) {
        console.log(response);
        reject("Error connecting to Cohere API");
        return;
      }
      console.log(JSON.stringify(response.body.classifications[0].labels));
      // Map from agent to prediction score
      const agentPredictionScores: Map<IAgent, number> = new Map<
        IAgent,
        number
      >();
      // For each agent, set the prediction score
      for (let agentName of Object.keys(
        response.body.classifications[0].labels
      )) {
        // The ! operator is used to assert that the value returned by get() is not null or undefined
        agentPredictionScores.set(
          this.labelToAgent.get(agentName)!,
          // Retrieving the confidence value associated with a specific label for the given agentName
          response.body.classifications[0].labels[agentName].confidence
        );
      }

      resolve(agentPredictionScores);
    });
  }

  /**
   * Return the appropriate agent depends on the current conversation
   * @returns IAgent that suits the current conversation
   */
  async coordinateAgent(): Promise<IAgent> {
    return new Promise<IAgent>(async (resolve, reject) => {
      try {
        let maximumContextWindow = 3; // Maximum context window to search for the appropriate agent
        maximumContextWindow = Math.min(
          maximumContextWindow,
          this.conversationMemory.messageNum
        );
        let bestAgent: IAgent | null = null;  // Result

        // For each context window, classify the conversation and return the agent with the highest prediction score
        // By going backward, the loop allows retrieving conversation strings from the conversationMemory in reverse chronological order
        // This means that the most recent conversations will be fetched first, followed by older conversations
        // This can be useful in scenarios where you want to process or analyze conversations in a historical order, starting from the latest ones.
        for (let startIdx = -1; startIdx >= -maximumContextWindow; startIdx--) {
          const conversationString = (
            await this.conversationMemory.getConversationAsString(
              startIdx,
              -1,
              false
            )
          ).conversationString;

          // Classify the conversation string
          const agentPredictionScores = this.classify(conversationString);

          const agentPredictionScoresArray = Array.from(
            (await agentPredictionScores).entries()
          );

          agentPredictionScoresArray.sort((a, b) => b[1] - a[1]);  // Sort the agentPredictionScoresArray in descending order
          // If the highest prediction score is above the confidence threshold, return the agent with the highest prediction score
          if (agentPredictionScoresArray[0][1] >= this.confidenceThreshold)
            bestAgent = agentPredictionScoresArray[0][0];

          // Compare two highest prediction scores
          const threshold = 0.1;
          if (
            Math.abs(
              agentPredictionScoresArray[0][1] -
                agentPredictionScoresArray[1][1]
            ) > threshold &&
            agentPredictionScoresArray[0][1] >= this.confidenceThreshold
          ) {
            break;
          }
        }
        
        // If the best agent is found, return the best agent
        if (bestAgent) {
          resolve(bestAgent);
          return;
        }
        resolve(this.defaultAgent); // Otherwise, return the default agent
      } catch (error: any) {
        reject(error);
      }
    });
  }
}

export { CentralCoordinator };

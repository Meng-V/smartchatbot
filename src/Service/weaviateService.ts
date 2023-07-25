import * as dotenv from "dotenv";
import weaviate, { WeaviateClient } from "weaviate-ts-client";

dotenv.config();

class WeaviateService {
  private static instance: WeaviateService;
  private client: WeaviateClient;
  private classObj = {
    class: "Conversation",
    vectorizer: "text2vec-openai",
    properties: [
      {
        name: "userInput",
        dataType: ["text"],
      },
      {
        name: "agentResponse",
        dataType: ["text"],
      },
    ],
  };

  private constructor() {
    this.client = weaviate.client({
      scheme: "http",
      host: `${process.env.WEAVIATE_HOST || "localhost"}:${
        process.env.WEAVIATE_PORT || 8080
      }`,
    });
    this.addSchema().catch(console.error);
  }

  public static getInstance(): WeaviateService {
    if (!WeaviateService.instance) {
      WeaviateService.instance = new WeaviateService();
    }

    return WeaviateService.instance;
  }

  private async addSchema() {
    const res = await this.client.schema
      .classCreator()
      .withClass(this.classObj)
      .do();
    console.log(res);
  }

  public async queryWeaviate(question: string) {
    const query = {
      query: {
        path: [
          {
            value: question,
            searchLimit: 1,
          },
        ],
        properties: ["userInput", "agentResponse", "certainty"],
      },
    };

    const result = await this.client.graphql
      .get()
      .withClassName("Conversation")
      .withFields("userInput agentResponse certainty")
      .withNearText({ concepts: [question] })
      .withLimit(1)
      .do();

    const satisfactory =
      result.data[0]?.certainty > (process.env.THRESHOLD || 0.9);
    const answer = satisfactory ? result.data[0].agentResponse : "";

    return { satisfactory, answer };
  }

  public async saveToWeaviate(userInput: string, agentResponse: string) {
    const result = await this.client.data
      .creator()
      .withClassName("Conversation")
      .withProperties({
        userInput: userInput,
        agentResponse: agentResponse,
      })
      .do();

    console.log(result);
  }
}

export default WeaviateService;

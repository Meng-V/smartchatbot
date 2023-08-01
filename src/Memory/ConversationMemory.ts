import { max } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationSummarizePrompt } from "../Prompt/ConversationSummarizePrompt";
import { TokenUsage } from "../Agent/IAgent";

type Role = "AIAgent" | "Customer";

class ConversationMemory {
  private conversation: [Role | null, string][];
  //Maximum conversation line would be keep in the memory. Oldest conversation would be tossed if exceed maxContextWindow
  private maxContextWindow: number | null;
  //Number of conversation line (most recent) that we would not summarize, allowing model to have the full context of most recent conversation
  private conversationBufferSize: number;
  //Token Limit spent for conversation memory
  private conversationTokenLimit: number | null = null;
  private llmModel: OpenAIModel | null = null;
  private conversationSummarizePrompt: ConversationSummarizePrompt | null =
    null;


  //This to prevent OpenAI API is called continuously to summarize the past conversation.
  private minimumTimeBetweenSummarizations: number = 1;
  private curBufferOffset: number;
  private curConversationSummary: string = "";

  /**
   *
   * @param maxContextWindow Maximum conversation line would be keep in the memory. Oldest conversation would be tossed if exceed maxContextWindow
   * @param llmModel llmModel used for summarize the past conversation
   * @param conversationBufferSize Number of conversation line (most recent) that we would not summarize, allowing model to have the full context of most recent conversation
   * @param conversationTokenLimit Token Limit spent for conversation memory
   * @param minimumTimeBetweenSummarizations This to prevent OpenAI API is called continuously to summarize the past conversation.
   */
  constructor(
    maxContextWindow: number | null = null,
    llmModel: OpenAIModel,
    conversationBufferSize: number = 0,
    conversationTokenLimit: number | null,
    minimumTimeBetweenSummarizations: number
  ) {
    this.conversationBufferSize = conversationBufferSize;

    this.maxContextWindow = maxContextWindow;

    this.conversation = Array(
      this.maxContextWindow ? this.maxContextWindow : 10
    ).fill([null, ""]);
    if (conversationTokenLimit) {
      this.conversationTokenLimit = conversationTokenLimit;
      this.llmModel = llmModel;
      this.conversationSummarizePrompt = new ConversationSummarizePrompt();
      this.minimumTimeBetweenSummarizations = minimumTimeBetweenSummarizations;
    } else {
      this.conversation = [];
    }
    this.curBufferOffset = this.minimumTimeBetweenSummarizations;
  }

  addToConversation(role: Role, text: string) {
    this.conversation.shift();
    this.conversation.push([role, text]);
    this.curBufferOffset += 1;
  }

  /**
   * Get the conversation in the current memory. Pass summary = true to get the conversation summary instead of the full conversation. When doing summarization, LLM would be used and cost tokens, this function also return the token usage information for each call.
   * @param start Positive or negative integer. 0: start from the oldest message, -1: start from the newest message.
   * @param end (inclusive) Positive or negative integer. 0: end at the oldest message, -1: end at the newest message.
   * @param summary  boolean: true if you want to summarize the retrived conversation. If summary = true, end index must be at the newest message.
   * @returns {conversationString: string; tokenUsage: TokenUsage}
   */
  async getConversationAsString(
    start: number = 0,
    end: number = -1,
    summary: boolean = false
  ): Promise<{
    conversationString: string;
    tokenUsage: TokenUsage;
  }> {
    return new Promise<{
      conversationString: string;
      tokenUsage: TokenUsage;
    }>(async (resolve, reject) => {
      start = start >= 0 ? start : start + this.conversation.length;
      end = end >= 0 ? end : end + this.conversation.length;

      let tokenUsage: TokenUsage = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      };

      if (
        start < -this.conversation.length ||
        start >= this.conversation.length ||
        end < -this.conversation.length ||
        end >= this.conversation.length
      ) {
        reject("Start and end index out of bound");
        return;
      }

      let conversationString = this.conversation
        .slice(
          start,
          end+1
        )
        .reduce((prevString, curLine) => {
          if (!curLine[0])  return prevString;
          return prevString + `${curLine[0]}: ${curLine[1]}\n`;
        }, "");
      if (!summary) {
        resolve({
          conversationString: conversationString,
          tokenUsage: { totalTokens: 0, completionTokens: 0, promptTokens: 0 },
        });
        return;
      }
      if (summary && end !== this.conversation.length - 1) {
        reject("If summary = true, end index must be at the newest message.");
        return;
      }
      
      const conversationToBeSummarized = (
        await this.getConversationAsString(
          start,
          -this.conversationBufferSize-1,
          false
        )
      ).conversationString;
      console.log(`Estimate length: ${conversationToBeSummarized.length}`);
      console.log(`Estimate token: ${conversationToBeSummarized.length / 4}`);
      if (
        this.conversationTokenLimit &&
        conversationToBeSummarized.length / 4.0 >=
          this.conversationTokenLimit &&
        this.conversationSummarizePrompt &&
        this.llmModel
      ) {
        if (this.curBufferOffset >= this.minimumTimeBetweenSummarizations) {
          this.curBufferOffset = 0;

          this.conversationSummarizePrompt.setConversationMemory(
            conversationToBeSummarized
          );

          const llmSummaryResponse = await this.llmModel.getModelResponse(
            this.conversationSummarizePrompt
          );
          this.curConversationSummary = llmSummaryResponse.response;
          //Update token usage
          tokenUsage.completionTokens +=
            llmSummaryResponse.usage.completionTokens;
          tokenUsage.promptTokens += llmSummaryResponse.usage.promptTokens;
          tokenUsage.totalTokens += llmSummaryResponse.usage.totalTokens;

          let conversationBuffer = await this.getConversationAsString(
            this.conversation.length -
              this.conversationBufferSize +
              start,
            -1,
            false
          );

          resolve({
            conversationString: `${this.curConversationSummary}\n${conversationBuffer.conversationString}`,
            tokenUsage: tokenUsage,
          });
          return;
        }

        //Use the past summarization
        let conversationBuffer = await this.getConversationAsString(
          this.conversation.length -
            this.conversationBufferSize -
            this.curBufferOffset -
            start,
          -1
        );

        resolve({
          conversationString: `${this.curConversationSummary}\n${conversationBuffer.conversationString}`,
          tokenUsage: tokenUsage,
        });
      }
      resolve({
        conversationString: conversationString,
        tokenUsage: tokenUsage,
      });
    });
  }
}

export { Role, ConversationMemory };

import { max } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { OpenAIModel } from "../LLM/LLMModels";
import { ConversationSummarizePrompt } from "../Prompt/ConversationSummarizePrompt";
import { TokenUsage } from "../Agent/IAgent";

type Role = "AIAgent" | "Customer";

/**
 * ConversationMemory would store the information about the conversation. Too old message would be removed. Relevant message would be kept or converted to a conversation summary to save tokens.
 */
class ConversationMemory {
  private conversation: [Role | null, string][];
  // Maximum conversation line would be keep in the memory. Oldest conversation would be tossed if exceed maxContextWindow
  private maxContextWindow: number | null;
  // Number of conversation line (most recent) that we would not summarize, allowing model to have the full context of most recent conversation
  private conversationBufferSize: number;
  // Token Limit spent for conversation memory
  private conversationTokenLimit: number | null = null;
  private llmModel: OpenAIModel | null = null;
  private conversationSummarizePrompt: ConversationSummarizePrompt | null =
    null;

  // This to prevent OpenAI API is called continuously to summarize the past conversation.
  private minimumTimeBetweenSummarizations: number = 1;
  private curBufferOffset: number;
  private curConversationSummary: string = "";
  // Number of message in the conversation
  public messageNum: number = 0;

  /**
   * Constructor
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

    //Initialize the conversation memory with empty string
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

  /**
   * Add message to conversation.
   * @param role role of the message sender
   * @param message message
   */
  addToConversation(role: Role, message: string) {
    this.conversation.shift();  // Remove the oldest message
    this.conversation.push([role, message]);  // Add the new message to the end of the conversation
    this.curBufferOffset += 1;  // Update the buffer offset
    this.messageNum += 1; // Update the number of message in the conversation
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

      // Check if start and end are still in bound
      if (
        start < -this.conversation.length ||
        start >= this.conversation.length ||
        end < -this.conversation.length ||
        end >= this.conversation.length
      ) {
        reject("Start and end index out of bound");
        return;
      }

      
      // Extract the conversation a portion of the conversation array
      let conversationString = this.conversation
        .slice(start, end + 1)  // Include end index in the extracted portion
        .reduce((prevString, curLine) => {
          if (!curLine[0]) return prevString; // If the role is null, it is not a valid conversation line
          return prevString + `${curLine[0]}: ${curLine[1]}\n`;
        }, "");

      // If summary is true, summarize the conversation
      // Otherwise, return the conversation as is
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
          -this.conversationBufferSize - 1,
          false
        )
      ).conversationString;
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

          let llmSummaryResponse;
          try {
            llmSummaryResponse = await this.llmModel.getModelResponse(
              this.conversationSummarizePrompt
            );
          } catch (error: any) {
            reject(error);
            return;
          }
          this.curConversationSummary = llmSummaryResponse.response;
          // Update token usage
          tokenUsage.completionTokens +=
            llmSummaryResponse.usage.completionTokens;
          tokenUsage.promptTokens += llmSummaryResponse.usage.promptTokens;
          tokenUsage.totalTokens += llmSummaryResponse.usage.totalTokens;

          let conversationBuffer;
          try {
            conversationBuffer = await this.getConversationAsString(
              this.conversation.length - this.conversationBufferSize + start,
              -1,
              false
            );
          } catch (error: any) {
            reject(error);
            return;
          }

          resolve({
            conversationString: `${this.curConversationSummary}\n${conversationBuffer.conversationString}`,
            tokenUsage: tokenUsage,
          });
          return;
        }

        // Use the past summarization
        let conversationBuffer;
        try {
          conversationBuffer = await this.getConversationAsString(
            this.conversation.length -
              this.conversationBufferSize -
              this.curBufferOffset -
              start,
            -1
          );
        } catch (error: any) {
          reject(error);
          return;
        }

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

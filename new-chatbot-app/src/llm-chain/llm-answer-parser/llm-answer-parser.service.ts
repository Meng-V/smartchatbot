import { Injectable } from '@nestjs/common';

export type AgentOutput =
  // The final answer from the agent to the user's question input
  | {
      outputType: 'final';
      finalAnswer: string;
    }
  // The agent's response to the user's action request input
  | {
      outputType: 'action';
      thought: string;
      action: string;
      actionInput: { [key: string]: string };
    };

/**
 * This service is used for parsing the LLM answer
 */
@Injectable()
export class LlmAnswerParserService {
  /**
   * This function parse the LLM output in the format:
   * {Action: "", Action Input: "", Final Answer: ""}
   * @param llmOutput the string output from the LLM
   * @returns AgentOutput
   */
  parseLLMOutput(llmOutput: string): AgentOutput {
    const jsonString = llmOutput
      .replace(/'/g, '') // Remove single quotes
      .replace(/\+/g, '') // Remove "+" signs
      .replace(/"(\w+)":\s*"([^"]*)"/g, '"$1": "$2"')
      .replace(/\n/g, '');
    let outputObj = JSON.parse(jsonString);
    if (typeof outputObj === 'string') {
      outputObj = JSON.parse(outputObj);
    }
    if (
      outputObj['Final Answer'] &&
      outputObj['Final Answer'] !== 'null' &&
      outputObj['Final Answer'] !== 'undefined'
    ) {
      return {
        outputType: 'final',
        finalAnswer: this.trimText(outputObj['Final Answer']),
      };
    } else if (
      outputObj['Tool'] &&
      outputObj['Tool Input'] &&
      outputObj['Tool'] !== 'null' &&
      outputObj['Tool Input'] !== 'null' &&
      outputObj['Tool'] !== 'undefined' &&
      outputObj['Tool Input'] !== 'undefined'
    ) {
      return {
        outputType: 'action',
        thought: this.trimText(outputObj['Thought']),
        action: this.trimText(outputObj['Tool']),
        actionInput: outputObj['Tool Input'],
      };
    } else {
      throw new Error('Error in parsing LLM output');
    }
  }
  /**
   * Trim leading space and new line character

   * @param text 
   * @returns 
   */
  private trimText(text: string) {
    return text.replace(/^\s+|\s+$/g, '');
  }

  /**
   * Replace double quote with single quote
   * @param input
   * @returns
   */
  public trimDoubleQuotes(input: string): string {
    return input.replace(/"/g, "'");
  }
}

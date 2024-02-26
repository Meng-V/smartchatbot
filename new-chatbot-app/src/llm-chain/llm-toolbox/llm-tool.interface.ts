export type LlmToolInput = Record<string, string | null>;

export interface LlmTool {
  /**
   * Name of the tool
   */
  name: string;
  /**
   * Detailed description of the tool
   */
  description: string;

  /**
   * Parameters that the tool accepts
   */
  parameters: {
    [parameterName: string]: string;
  };

  /**
   * Method for LLM agent to use
   * @param input input that the LLM model inputs to the tool
   */
  toolRunForLlm(input: LlmToolInput): Promise<string>; //
}
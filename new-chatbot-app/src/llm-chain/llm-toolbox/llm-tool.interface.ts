export type LlmToolInput = Record<string, string | null>;

export interface LlmTool {
  readonly toolName: string;
  readonly toolDescription: string;
  readonly toolParametersStructure: { [parameterName: string]: string };

  /**
   * Interface method for LLM agent to use
   * @param input input that the LLM model inputs to the tool
   * @returns the result from the tools in the readable string
   */
  toolRunForLlm(llmToolInput: LlmToolInput): Promise<string>;
}

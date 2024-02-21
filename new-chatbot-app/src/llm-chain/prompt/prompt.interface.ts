export interface PromptInterface {
  modelDescription: string; // Description of the model
  /**
   * Get the description of the system
   */
  getSystemDescription(): string; // Description of the system
  /**
   * Get the prompt
   */
  getPrompt(): Promise<{ prompt: string; tokenUsage: TokenUsage }>;
}

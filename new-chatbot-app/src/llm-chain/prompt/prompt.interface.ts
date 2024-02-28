export interface Prompt {
  /**
   * Get the description of the system
   */
  getSystemDescription(): string; // Description of the system
  /**
   * Get the prompt
   */
  getPrompt(): Promise<{ prompt: string; tokenUsage?: ModelTokenUsage}>;
}

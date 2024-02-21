export interface LlmInterface {
  getModelResponse(
    userPrompt: string,
    systemPrompt?: string,
    ...config: any[]
  ): Promise<{ response: string; tokenUsage: TokenUsage }>;
}

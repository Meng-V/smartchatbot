import { TokenUsage } from '../../shared/services/token-usage/token-usage.service';

export interface LlmInterface {
  getModelResponse(
    userPrompt: string,
    systemPrompt?: string,
    ...config: any[]
  ): Promise<{ response: string; tokenUsage: TokenUsage }>;
}

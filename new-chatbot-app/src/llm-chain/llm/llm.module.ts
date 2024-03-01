import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { OpenaiApiService } from './openai-api/openai-api.service';
import { TokenUsageService } from 'src/shared/services/token-usage/token-usage.service';

export type LlmModelType = OpenAiModelType | CohereModelType;

export enum CohereModelType {
  Generate,
  Embed,
  Summarize,
}

export type LlmModelSetting = {
  modelName: OpenAiModelType;
  temperature: number;
  top_p: number;
};

@Module({
  providers: [LlmService, OpenaiApiService, TokenUsageService],
})
export class LlmModule {}

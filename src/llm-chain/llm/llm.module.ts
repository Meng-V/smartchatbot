import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';
import { SharedModule } from '../../shared/shared.module';
import { ApiResilienceService } from '../../shared/services/api-resilience/api-resilience.service';

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
  imports: [SharedModule],
  providers: [LlmService, OpenaiApiService, ApiResilienceService],
  exports: [LlmService, OpenaiApiService, ApiResilienceService],
})
export class LlmModule {}

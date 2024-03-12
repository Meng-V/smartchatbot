import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import {
  OpenaiApiService,
  OpenAiModelType,
} from './openai-api/openai-api.service';
import { SharedModule } from '../../shared/shared.module';

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
  providers: [LlmService, OpenaiApiService],
  exports: [LlmService, OpenaiApiService],
})
export class LlmModule {}

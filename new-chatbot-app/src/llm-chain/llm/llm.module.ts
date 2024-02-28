import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { OpenaiApiService } from './openai-api/openai-api.service';

import { SharedModule } from 'src/shared/shared.module';

export type LlmModelSetting = {
  modelName: OpenAiModelType;
  temperature: number;
  top_p: number;
};

@Module({
  imports: [SharedModule],
  providers: [LlmService, OpenaiApiService],
})
export class LlmModule {}

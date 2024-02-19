import { Module } from '@nestjs/common';
import { LlmInterface } from './llm.interface';
import { LlmService } from './llm.service';
import { OpenaiApiService } from './openai-api/openai-api.service';

export type LlmModelSetting = {
  modelName: ModelName;
  temperature: number;
  top_p: number;
};

@Module({
  "providers": [{
    provide: "LlmInterface",
    useClass: OpenaiApiService,
  }, LlmService],
})
export class LlmModule {}

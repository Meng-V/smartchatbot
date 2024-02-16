import { Module } from '@nestjs/common';
import { NetworkService } from 'src/shared/services/network/network.service';

export type LlmModelSetting = {
  modelName: ModelName;
  temperature: number;
  top_p: number;
};

@Module({
  "providers": [NetworkService],
})
export class LlmModule {}

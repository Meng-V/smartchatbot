import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { WeaviateModule } from '../weaviate/weaviate.module';

@Module({
  imports: [SharedModule, WeaviateModule],
})
export class IngestionRunnerModule {}

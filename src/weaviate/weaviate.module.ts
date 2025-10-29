import { Module } from '@nestjs/common';
import { WeaviateService } from './weaviate.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [WeaviateService],
  exports: [WeaviateService],
})
export class WeaviateModule {}

import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { WeaviateModule } from '../weaviate/weaviate.module';
import { RoutingModule } from '../routing/routing.module';

@Module({
  imports: [SharedModule, WeaviateModule, RoutingModule],
})
export class EvalRunnerModule {}

import { Module } from '@nestjs/common';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { LibraryApiModule } from './library-api/library-api.module';
import { SharedModule } from './shared/shared.module';
import { GatewayModule } from './gateway/gateway.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    LlmChainModule,
    LibraryApiModule,
    SharedModule,
    GatewayModule,
    DatabaseModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { LibraryApiModule } from './library-api/library-api.module';
import { SharedModule } from './shared/shared.module';
import { PrismaService } from './prisma.service';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [LlmChainModule, LibraryApiModule, SharedModule],
  providers: [ChatGateway, PrismaService],
  imports: [LlmChainModule, LibraryApiModule, SharedModule, GatewayModule],
})
export class AppModule {}

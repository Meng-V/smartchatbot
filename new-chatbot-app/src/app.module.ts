import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmChainModule } from './llm-chain/llm-chain.module';
import { LibraryApiModule } from './library-api/library-api.module';
import { ConfigModule } from '@nestjs/config';
import { RetrieveEnvironmentVariablesService } from './services/retrieve-environment-variables/retrieve-environment-variables.service';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  imports: [ConfigModule.forRoot(), LlmChainModule, LibraryApiModule],
  controllers: [AppController],
  providers: [AppService, RetrieveEnvironmentVariablesService, ChatGateway],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PrismaService } from './prisma-service/prisma.service';
@Module({
  providers: [DatabaseService, PrismaService],
  exports: [DatabaseService, PrismaService],
})
export class DatabaseModule {}

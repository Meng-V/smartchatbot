import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});

  // Enable CORS for frontend origin (adjust as needed)
  app.enableCors({
    origin: ['https://new.lib.miamioh.edu'], // your frontend URL
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();

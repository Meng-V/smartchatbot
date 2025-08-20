import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

const RESTART_FLAG_FILE = path.join(process.cwd(), '.restart-flag');
const MAX_RESTART_ATTEMPTS = 5;
let restartAttempts = 0;

async function bootstrap() {
  try {
    console.log(
      `🚀 Starting application (attempt ${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})...`,
    );

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS for frontend origin (adjust as needed)
    app.enableCors({
      origin: ['https://new.lib.miamioh.edu'], // your frontend URL
      credentials: true,
    });

    // Global error handling
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      handleCriticalError('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      handleCriticalError('unhandledRejection', reason);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('📤 SIGTERM received, shutting down gracefully...');
      gracefulShutdown(app);
    });

    process.on('SIGINT', () => {
      console.log('📤 SIGINT received, shutting down gracefully...');
      gracefulShutdown(app);
    });

    // Check for restart flag
    if (fs.existsSync(RESTART_FLAG_FILE)) {
      console.log('🔄 Restart flag detected, cleaning up...');
      fs.unlinkSync(RESTART_FLAG_FILE);
    }

    await app.listen(3000);
    console.log('✅ Application is running on http://localhost:3000');

    // Reset restart attempts on successful start
    restartAttempts = 0;
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    handleCriticalError('bootstrap', error);
  }
}

function handleCriticalError(source: string, error: any) {
  console.error(`💥 Critical error from ${source}:`, error);

  // Write error details to file for debugging
  const errorLog = {
    timestamp: new Date().toISOString(),
    source,
    error: error.toString(),
    stack: error.stack,
    restartAttempt: restartAttempts + 1,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'last-error.json'),
    JSON.stringify(errorLog, null, 2),
  );

  if (restartAttempts < MAX_RESTART_ATTEMPTS) {
    console.log(
      `🔄 Attempting restart (${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})...`,
    );
    restartAttempts++;

    // Create restart flag
    fs.writeFileSync(RESTART_FLAG_FILE, new Date().toISOString());

    // Restart after a short delay
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  } else {
    console.error(
      '💀 Maximum restart attempts reached. Manual intervention required.',
    );
    process.exit(1);
  }
}

async function gracefulShutdown(app: any) {
  try {
    console.log('🛑 Closing server...');
    await app.close();
    console.log('✅ Server closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

bootstrap();

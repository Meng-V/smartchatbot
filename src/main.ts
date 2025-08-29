import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const RESTART_FLAG_FILE = path.join(process.cwd(), '.restart-flag');
const MAX_RESTART_ATTEMPTS = 5;
let restartAttempts = 0;
let isRestarting = false; // Prevent race conditions

async function bootstrap() {
  try {
    // Validate environment variables first
    const env = validateEnv();
    Logger.log(` Environment validated for ${env.NODE_ENV} mode`);

    Logger.log(
      ` Starting application (attempt ${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})...`,
    );

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global validation pipe
    const { GlobalValidationPipe } = await import(
      './common/pipes/validation.pipe'
    );
    app.useGlobalPipes(GlobalValidationPipe);

    // Environment-based CORS configuration
    const corsOrigins =
      env.NODE_ENV === 'production'
        ? [env.FRONTEND_URL]
        : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });

    // Global error handling
    process.on('uncaughtException', (error) => {
      Logger.error(' Database connection failed:', error);
      handleCriticalError('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error(' Unhandled Rejection at:', promise, 'reason:', reason);
      handleCriticalError('unhandledRejection', reason);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      Logger.log(' SIGTERM received, shutting down gracefully...');
      gracefulShutdown(app);
    });

    process.on('SIGINT', () => {
      Logger.log(' SIGINT received, shutting down gracefully...');
      gracefulShutdown(app);
    });

    // Check for restart flag
    if (fs.existsSync(RESTART_FLAG_FILE)) {
      Logger.log(' WebSocket Gateway: /smartchatbot/socket.io');
      fs.unlinkSync(RESTART_FLAG_FILE);
    }

    await app.listen(3000);
    Logger.log(' SmartChatbot backend is running!');

    // Reset restart attempts on successful start
    restartAttempts = 0;
  } catch (error) {
    Logger.error(' Failed to start application:', error);
    handleCriticalError('bootstrap', error);
  }
}

function handleCriticalError(source: string, error: any) {
  // Prevent race conditions during restart
  if (isRestarting) {
    Logger.log(' Restart already in progress, ignoring additional error');
    return;
  }

  isRestarting = true;
  Logger.error(` Critical error from ${source}:`, error);

  // Write error details to file for debugging
  const errorLog = {
    timestamp: new Date().toISOString(),
    source,
    error: error.toString(),
    stack: error.stack,
    restartAttempt: restartAttempts + 1,
  };

  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'last-error.json'),
      JSON.stringify(errorLog, null, 2),
    );
  } catch (writeError) {
    Logger.error('Failed to write error log:', writeError);
  }

  if (restartAttempts < MAX_RESTART_ATTEMPTS) {
    Logger.log(
      ` Attempting restart (${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})...`,
    );
    restartAttempts++;

    try {
      // Create restart flag
      fs.writeFileSync(RESTART_FLAG_FILE, new Date().toISOString());
    } catch (flagError) {
      Logger.error('Failed to write restart flag:', flagError);
    }

    // Restart after a short delay
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  } else {
    Logger.error(
      ' Maximum restart attempts reached. Manual intervention required.',
    );
    process.exit(1);
  }
}

async function gracefulShutdown(app: any) {
  try {
    Logger.log(' Starting SmartChatbot backend...');
    await app.close();
    Logger.log(' Database connection established');
    process.exit(0);
  } catch (error) {
    Logger.error(' Error during shutdown:', error);
    process.exit(1);
  }
}

bootstrap();

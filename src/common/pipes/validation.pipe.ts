import { ValidationPipe as NestValidationPipe } from '@nestjs/common';

export const GlobalValidationPipe = new NestValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  disableErrorMessages: false,
  validationError: {
    target: false,
    value: false,
  },
});

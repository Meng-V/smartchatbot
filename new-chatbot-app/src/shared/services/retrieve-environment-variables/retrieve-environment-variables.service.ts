import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
@Global()
export class RetrieveEnvironmentVariablesService {
  private readonly logger = new Logger(
    RetrieveEnvironmentVariablesService.name,
  );

  constructor(private configService: ConfigService) {}

  retrieve<T>(variableName: string): T {
    const variable: T | undefined = this.configService.get<T>(variableName);
    if (variable === undefined) {
      const errorMessage = `Variable ${variableName} is not defined in .env`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return variable;
  }
}

import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

<<<<<<< HEAD
=======
/**
 * Service used for securely retrieving environment variable
 */
>>>>>>> dev
@Injectable()
@Global()
export class RetrieveEnvironmentVariablesService {
  private readonly logger = new Logger(
    RetrieveEnvironmentVariablesService.name,
  );

  constructor(private configService: ConfigService) {}

<<<<<<< HEAD
=======
  /**
   * Retrieve variable from environment. Will throw error if cannot find the desired variable
   * @param variableName 
   * @returns 
   */
>>>>>>> dev
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

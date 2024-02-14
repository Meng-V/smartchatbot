import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetrieveEnvironmentVariablesService {
  constructor(private configService: ConfigService) {}

  retrieve<T>(variableName: string): T {
    const variable: T | undefined = this.configService.get<T>(variableName);
    if (variable === undefined) {
      throw new Error(`Variable ${variableName} is not defined in .env`);
    }

    return variable;
  }
}

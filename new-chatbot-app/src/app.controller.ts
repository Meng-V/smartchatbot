import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RetrieveEnvironmentVariablesService } from './shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

@Controller()
export class AppController {
  private readonly URL: string = `${this.retrieveEnvironmentVariablesService.retrieve<string>('URL')}:${this.retrieveEnvironmentVariablesService.retrieve<string>('BACKEND_PORT')}`;

  constructor(
    private readonly appService: AppService,
    private retrieveEnvironmentVariablesService: RetrieveEnvironmentVariablesService,
  ) {}
}

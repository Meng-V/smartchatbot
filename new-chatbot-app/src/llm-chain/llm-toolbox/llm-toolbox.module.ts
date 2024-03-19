import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';
import { LibappsAuthorizationService } from 'src/library-api/libapps-authorization/libapps-authorization.service';
import { RetrieveEnvironmentVariablesService } from 'src/shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

@Module({
  imports: [LibraryApiModule, HttpModule],
  providers: [
    ConfigService,
    LibrarianSubjectLookupToolService,
    LibappsAuthorizationService,
    RetrieveEnvironmentVariablesService],
})
export class LlmToolboxModule {}

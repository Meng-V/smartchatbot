import { Module } from '@nestjs/common';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [LibraryApiModule, HttpModule],
  providers: [LibrarianSubjectLookupToolService],
  exports: [LibrarianSubjectLookupToolService],
})
export class LlmToolboxModule {}

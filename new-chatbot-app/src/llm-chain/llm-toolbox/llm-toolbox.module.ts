import { Module } from '@nestjs/common';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';
import { CitationAssistToolService } from './citation-assist-tool/citation-assist-tool.service';

@Module({
  imports: [LibraryApiModule, HttpModule],
  providers: [LibrarianSubjectLookupToolService, CitationAssistToolService],
  exports: [LibrarianSubjectLookupToolService, CitationAssistToolService],
})
export class LlmToolboxModule {}

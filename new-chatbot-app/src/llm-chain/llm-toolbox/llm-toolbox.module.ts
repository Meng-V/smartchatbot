import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { CitationAssistToolService } from './citation-assist-tool/citation-assist-tool.service';
import { CancelReservationToolService } from './libcal-tools/cancel-reservation-tool/cancel-reservation-tool.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [LibraryApiModule, HttpModule, SharedModule],
  providers: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CancelReservationToolService,
  ],
  exports: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CancelReservationToolService,
  ],
})
export class LlmToolboxModule {}

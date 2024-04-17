import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { CitationAssistToolService } from './citation-assist-tool/citation-assist-tool.service';
import { CancelReservationToolService } from './libcal-tools/cancel-reservation-tool/cancel-reservation-tool.service';
import { CheckOpenHourToolService } from './libcal-tools/check-open-hour-tool/check-open-hour-tool.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [LibraryApiModule, HttpModule, SharedModule],
  providers: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CancelReservationToolService,
    CheckOpenHourToolService,
  ],
  exports: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CancelReservationToolService,
    CheckOpenHourToolService,
  ],
})
export class LlmToolboxModule {}

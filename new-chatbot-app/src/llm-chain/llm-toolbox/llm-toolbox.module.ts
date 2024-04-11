import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';
import { CitationAssistToolService } from './citation-assist-tool/citation-assist-tool.service';
import { SharedModule } from '../../shared/shared.module';
import { CheckRoomAvailabilityToolService } from './libcal-tools/check-room-availability-tool/check-room-availability-tool.service';
import { ReserveRoomToolService } from './libcal-tools/reserve-room-tool/reserve-room-tool.service';

@Module({
  imports: [LibraryApiModule, HttpModule, SharedModule],
  providers: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CheckRoomAvailabilityToolService,
    ReserveRoomToolService,
  ],
  exports: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CheckRoomAvailabilityToolService,
    ReserveRoomToolService,
  ],
})
export class LlmToolboxModule {}

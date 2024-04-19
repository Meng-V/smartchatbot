import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { CitationAssistToolService } from './citation-assist-tool/citation-assist-tool.service';
import { CancelReservationToolService } from './libcal-tools/cancel-reservation-tool/cancel-reservation-tool.service';
import { CheckOpenHourToolService } from './libcal-tools/check-open-hour-tool/check-open-hour-tool.service';
import { SharedModule } from '../../shared/shared.module';
import { CheckRoomAvailabilityToolService } from './libcal-tools/check-room-availability-tool/check-room-availability-tool.service';
import { ReserveRoomToolService } from './libcal-tools/reserve-room-tool/reserve-room-tool.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, LibraryApiModule, HttpModule, SharedModule],
  providers: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CheckRoomAvailabilityToolService,
    ReserveRoomToolService,
    CancelReservationToolService,
    CheckOpenHourToolService,
  ],
  exports: [
    LibrarianSubjectLookupToolService,
    CitationAssistToolService,
    CheckRoomAvailabilityToolService,
    ReserveRoomToolService,
    CancelReservationToolService,
    CheckOpenHourToolService,
  ],
})
export class LlmToolboxModule {}

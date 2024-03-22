import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LibrarianSubjectLookupToolService } from './libapps-tools/librarian-subject-lookup-tool/librarian-subject-lookup-tool.service';
import { CancelReservationToolService } from './libcal-tools/cancel-reservation-tool/cancel-reservation-tool.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [LibraryApiModule, HttpModule, SharedModule],
  providers: [
    LibrarianSubjectLookupToolService,
    CancelReservationToolService
  ],
})
export class LlmToolboxModule {}

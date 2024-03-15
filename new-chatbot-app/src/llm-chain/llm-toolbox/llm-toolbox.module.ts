import { Module } from '@nestjs/common';
import { LibrarianSubjectLookupService } from './libapps-tools/librarian-subject-lookup/librarian-subject-lookup.service';
import { LibraryApiModule } from '../../library-api/library-api.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [LibraryApiModule, HttpModule],
  providers: [LibrarianSubjectLookupService],
})
export class LlmToolboxModule {}

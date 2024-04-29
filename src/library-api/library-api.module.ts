import { Module } from '@nestjs/common';
import { LibcalAuthorizationService } from './libcal-authorization/libcal-authorization.service';
import { LibappsAuthorizationService } from './libapps-authorization/libapps-authorization.service';
import { SharedModule } from '../shared/shared.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SharedModule, HttpModule],
  providers: [LibcalAuthorizationService, LibappsAuthorizationService],
  exports: [LibcalAuthorizationService, LibappsAuthorizationService],
})
export class LibraryApiModule {}

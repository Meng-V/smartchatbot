import { Module } from '@nestjs/common';
import { LibcalAuthorizationService } from './libcal-authorization/libcal-authorization.service';
import { LibappsAuthorizationService } from './libapps-authorization/libapps-authorization.service';
import { LibAnsAuthorizationService } from './libans-authorization/libans-authorization.service';
import { SharedModule } from '../shared/shared.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SharedModule, HttpModule],
  providers: [
    LibcalAuthorizationService,
    LibappsAuthorizationService,
    LibAnsAuthorizationService,
  ],
  exports: [
    LibcalAuthorizationService,
    LibappsAuthorizationService,
    LibAnsAuthorizationService,
  ],
})
export class LibraryApiModule {}

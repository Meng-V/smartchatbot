import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { LibappsAuthorizationService } from './libapps-authorization/libapps-authorization.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [HttpModule, SharedModule],
  providers: [LibappsAuthorizationService],
  exports: [LibappsAuthorizationService],
})
export class LibraryApiModule {}

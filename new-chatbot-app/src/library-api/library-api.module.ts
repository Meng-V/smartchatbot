import { Module } from '@nestjs/common';
import { CancelReservationService } from './cancel-reservation/cancel-reservation.service';
import { LibcalApiAuthorizationService } from './libcal-api-auth/libcal-api-auth.service';
import { UtilService } from './util/util.service';

@Module({
  imports: [],
  providers: [CancelReservationService, LibcalApiAuthorizationService, UtilService],
})
export class LibraryApiModule {}

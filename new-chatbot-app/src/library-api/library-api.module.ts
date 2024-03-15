import { Module } from '@nestjs/common';
import { CancelReservationService } from './cancel-reservation/cancel-reservation.service';
import { LibcalApiAuthorizationService } from './libcal-api-auth/libcal-api-auth.service';
import { UtilService } from './util/util.service';
import { SharedModule } from 'src/shared/shared.module';
import { PrismaService } from 'src/prisma.service';
import { RoomReservationService } from './room-reservation/room-reservation.service';

@Module({
  imports: [SharedModule],
  providers: [
    CancelReservationService,
    LibcalApiAuthorizationService,
    UtilService,
    PrismaService,
    RoomReservationService
  ]
})
export class LibraryApiModule {}

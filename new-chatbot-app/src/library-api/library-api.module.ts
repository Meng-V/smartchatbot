import { Module } from '@nestjs/common';
import { CancelReservationService } from '../llm-chain/llm-toolbox/libcal-tools/cancel-reservation/cancel-reservation.service';
import { LibcalApiAuthorizationService } from './libcal-api-auth/libcal-api-auth.service';
import { SharedModule } from 'src/shared/shared.module';
import { PrismaService } from 'src/prisma.service';
import { RoomReservationService } from '../llm-chain/llm-toolbox/libcal-tools/room-reservation/room-reservation.service';

@Module({
  imports: [SharedModule],
  providers: [
    CancelReservationService,
    LibcalApiAuthorizationService,
    PrismaService,
    RoomReservationService
  ]
})
export class LibraryApiModule {}

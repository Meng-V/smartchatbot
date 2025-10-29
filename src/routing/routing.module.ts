import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [RouterService],
  exports: [RouterService],
})
export class RoutingModule {}

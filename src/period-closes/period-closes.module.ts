import { Module } from '@nestjs/common';
import { PeriodClosesService } from './period-closes.service';
import { PeriodClosesController } from './period-closes.controller';

@Module({
  controllers: [PeriodClosesController],
  providers: [PeriodClosesService],
})
export class PeriodClosesModule {}

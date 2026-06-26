import { Module } from '@nestjs/common';
import { PeriodAveragesService } from './period-averages.service';
import { PeriodAveragesController } from './period-averages.controller';

@Module({
  controllers: [PeriodAveragesController],
  providers: [PeriodAveragesService],
})
export class PeriodAveragesModule {}

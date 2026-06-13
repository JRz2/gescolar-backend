import { Module } from '@nestjs/common';
import { ComponentScoresService } from './component-scores.service';
import { ComponentScoresController } from './component-scores.controller';

@Module({
  controllers: [ComponentScoresController],
  providers: [ComponentScoresService],
})
export class ComponentScoresModule {}

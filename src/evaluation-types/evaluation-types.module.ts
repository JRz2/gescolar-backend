import { Module } from '@nestjs/common';
import { EvaluationTypesService } from './evaluation-types.service';
import { EvaluationTypesController } from './evaluation-types.controller';

@Module({
  controllers: [EvaluationTypesController],
  providers: [EvaluationTypesService],
})
export class EvaluationTypesModule {}

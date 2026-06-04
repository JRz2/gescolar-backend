import { Module } from '@nestjs/common';
import { SubjectAssignmentsService } from './subject-assignments.service';
import { SubjectAssignmentsController } from './subject-assignments.controller';

@Module({
  controllers: [SubjectAssignmentsController],
  providers: [SubjectAssignmentsService],
  exports: [SubjectAssignmentsService],
})
export class SubjectAssignmentsModule {}

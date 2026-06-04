import { PartialType } from '@nestjs/swagger';
import { CreateStudentGradeDto } from './create-student-grade.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StudentGradeStatus } from '@prisma/client';

export class UpdateStudentGradeDto extends PartialType(CreateStudentGradeDto) {
    @IsEnum(StudentGradeStatus)
    @IsOptional()
    status?: StudentGradeStatus;
}
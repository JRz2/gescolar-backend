import { IsInt, Min, Max, IsEnum, IsOptional } from 'class-validator';
import { StudentGradeStatus } from '@prisma/client';

export class CreateStudentGradeDto {
    @IsInt()
    studentId: number;

    @IsInt()
    gradeId: number;

    @IsInt()
    @Min(2000)
    @Max(2100)
    academicYear: number;

    @IsEnum(StudentGradeStatus)
    @IsOptional()
    status?: StudentGradeStatus;
}
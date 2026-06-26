import { IsInt, IsFloat, IsOptional, Min, Max } from 'class-validator';

export class CreatePeriodAverageDto {
    @IsInt()
    studentId: number;

    @IsInt()
    subjectAssignmentId: number;

    @IsInt()
    @Min(1)
    @Max(12)
    period: number;

    @IsFloat()
    @Min(0)
    @Max(100)
    average: number;

    @IsFloat()
    @IsOptional()
    @Min(0)
    @Max(100)
    percentage?: number;
}
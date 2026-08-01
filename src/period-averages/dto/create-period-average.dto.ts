import { IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreatePeriodAverageDto {
    @IsInt()
    studentId: number;

    @IsInt()
    subjectAssignmentId: number;

    @IsInt()
    @Min(1)
    @Max(12)
    period: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    average: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    percentage?: number;
}
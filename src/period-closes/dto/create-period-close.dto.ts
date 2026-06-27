import { IsInt, Min, Max } from 'class-validator';

export class CreatePeriodCloseDto {
    @IsInt()
    subjectAssignmentId: number;

    @IsInt()
    @Min(1)
    @Max(12)
    period: number;
}
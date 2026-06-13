import { IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateComponentScoreDto {
    @IsInt()
    studentId: number;

    @IsInt()
    evaluationComponentId: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    score: number;

    @IsString()
    @IsOptional()
    observations?: string;
}
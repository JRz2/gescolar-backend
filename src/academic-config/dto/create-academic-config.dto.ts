import { IsString, IsInt, IsEnum, IsDateString, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { PeriodType } from '@prisma/client';

export class CreateAcademicConfigDto {
    @IsString()
    name: string;

    @IsInt()
    @Min(2000)
    @Max(2100)
    academicYear: number;

    @IsEnum(PeriodType)
    periodType: PeriodType;

    @IsInt()
    @Min(1)
    @Max(12)
    numberOfPeriods: number;

    @IsDateString()
    startDate: Date;

    @IsDateString()
    endDate: Date;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
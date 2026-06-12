import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateEvaluationTypeDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    color?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
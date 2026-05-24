import { PartialType } from '@nestjs/swagger';
import { CreateGradeDto } from './create-grade.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGradeDto extends PartialType(CreateGradeDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
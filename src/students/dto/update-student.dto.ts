import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
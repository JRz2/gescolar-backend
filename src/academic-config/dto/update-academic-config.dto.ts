import { PartialType } from '@nestjs/swagger';
import { CreateAcademicConfigDto } from './create-academic-config.dto';

export class UpdateAcademicConfigDto extends PartialType(CreateAcademicConfigDto) { }
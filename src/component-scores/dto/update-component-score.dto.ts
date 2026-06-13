import { PartialType } from '@nestjs/swagger';
import { CreateComponentScoreDto } from './create-component-score.dto';

export class UpdateComponentScoreDto extends PartialType(CreateComponentScoreDto) { }
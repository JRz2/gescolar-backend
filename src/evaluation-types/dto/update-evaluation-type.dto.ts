import { PartialType } from '@nestjs/swagger';
import { CreateEvaluationTypeDto } from './create-evaluation-type.dto';

export class UpdateEvaluationTypeDto extends PartialType(CreateEvaluationTypeDto) { }
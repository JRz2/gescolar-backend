import { PartialType } from '@nestjs/swagger';
import { CreatePeriodCloseDto } from './create-period-close.dto';

export class UpdatePeriodCloseDto extends PartialType(CreatePeriodCloseDto) { }
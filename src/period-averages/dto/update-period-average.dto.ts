import { PartialType } from '@nestjs/swagger';
import { CreatePeriodAverageDto } from './create-period-average.dto';

export class UpdatePeriodAverageDto extends PartialType(CreatePeriodAverageDto) { }
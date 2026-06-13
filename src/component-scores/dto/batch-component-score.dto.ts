import { IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateComponentScoreDto } from './create-component-score.dto';

export class BatchComponentScoreDto {
    @IsInt()
    evaluationComponentId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateComponentScoreDto)
    scores: CreateComponentScoreDto[];
}
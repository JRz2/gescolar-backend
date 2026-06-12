import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EvaluationTypesService } from './evaluation-types.service';
import { CreateEvaluationTypeDto } from './dto/create-evaluation-type.dto';
import { UpdateEvaluationTypeDto } from './dto/update-evaluation-type.dto'; 

@Controller('evaluation-types')
export class EvaluationTypesController {
  constructor(private readonly evaluationTypesService: EvaluationTypesService) { }

  @Post()
  create(@Body() createDto: CreateEvaluationTypeDto) {
    const currentUserId = 1;
    return this.evaluationTypesService.create(createDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.evaluationTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEvaluationTypeDto) {
    const currentUserId = 1;
    return this.evaluationTypesService.update(+id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const currentUserId = 1;
    return this.evaluationTypesService.remove(+id, currentUserId);
  }
}
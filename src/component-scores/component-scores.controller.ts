import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ComponentScoresService } from './component-scores.service';
import { CreateComponentScoreDto } from './dto/create-component-score.dto';
import { UpdateComponentScoreDto } from './dto/update-component-score.dto';
import { BatchComponentScoreDto } from './dto/batch-component-score.dto';

@Controller('component-scores')
export class ComponentScoresController {
  constructor(private readonly service: ComponentScoresService) { }

  @Post()
  create(@Body() createDto: CreateComponentScoreDto) {
    const currentUserId = 1;
    return this.service.create(createDto, currentUserId);
  }

  @Post('batch')
  batchCreate(@Body() batchDto: BatchComponentScoreDto) {
    const currentUserId = 1;
    return this.service.batchCreate(batchDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('by-student/:studentId')
  findByStudent(
    @Param('studentId') studentId: string,
    @Query('subjectAssignmentId') subjectAssignmentId?: string,
  ) {
    return this.service.findByStudent(
      +studentId,
      subjectAssignmentId ? +subjectAssignmentId : undefined,
    );
  }

  @Get('by-component/:componentId')
  findByComponent(@Param('componentId') componentId: string) {
    return this.service.findByComponent(+componentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateComponentScoreDto) {
    const currentUserId = 1;
    return this.service.update(+id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const currentUserId = 1;
    return this.service.remove(+id, currentUserId);
  }
}
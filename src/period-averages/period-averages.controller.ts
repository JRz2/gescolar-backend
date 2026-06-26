import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PeriodAveragesService } from './period-averages.service';
import { CreatePeriodAverageDto } from './dto/create-period-average.dto';
import { UpdatePeriodAverageDto } from './dto/update-period-average.dto';
@Controller('period-averages')
export class PeriodAveragesController {
  constructor(private readonly service: PeriodAveragesService) { }

  @Post()
  create(@Body() createDto: CreatePeriodAverageDto) {
    const currentUserId = 1;
    return this.service.create(createDto, currentUserId);
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

  @Get('by-assignment/:subjectAssignmentId')
  findBySubjectAssignment(@Param('subjectAssignmentId') subjectAssignmentId: string) {
    return this.service.findBySubjectAssignment(+subjectAssignmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePeriodAverageDto) {
    const currentUserId = 1;
    return this.service.update(+id, updateDto, currentUserId);
  }

  @Patch(':id/close')
  closePeriod(@Param('id') id: string) {
    const currentUserId = 1;
    return this.service.closePeriod(+id, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const currentUserId = 1;
    return this.service.remove(+id, currentUserId);
  }
}
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PeriodClosesService } from './period-closes.service';
import { CreatePeriodCloseDto } from './dto/create-period-close.dto';
import { UpdatePeriodCloseDto } from './dto/update-period-close.dto';

@Controller('period-closes')
export class PeriodClosesController {
  constructor(private readonly service: PeriodClosesService) { }

  @Post()
  create(@Body() createDto: CreatePeriodCloseDto) {
    const currentUserId = 1;
    return this.service.create(createDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('by-assignment/:subjectAssignmentId')
  findBySubjectAssignment(@Param('subjectAssignmentId') subjectAssignmentId: string) {
    return this.service.findBySubjectAssignment(+subjectAssignmentId);
  }

  @Get('check-status')
  checkPeriodStatus(
    @Query('subjectAssignmentId') subjectAssignmentId: string,
    @Query('period') period: string,
  ) {
    return this.service.checkPeriodStatus(+subjectAssignmentId, +period);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePeriodCloseDto) {
    const currentUserId = 1;
    return this.service.update(+id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const currentUserId = 1;
    return this.service.remove(+id, currentUserId);
  }
}
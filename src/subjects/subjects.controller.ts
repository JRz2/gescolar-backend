import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) { }

  @Post()
  create(@Body() createSubjectDto: CreateSubjectDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectsService.create(createSubjectDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get('available-years')
  getAvailableYears() {
    return this.subjectsService.getAvailableYears();
  }

  @Get('by-year/:year')
  findByYear(@Param('year', ParseIntPipe) year: number) {
    return this.subjectsService.findByYear(year);
  }

  @Get('available-for-grade/:gradeId')
  getAvailableForGrade(
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Query('academicYear', ParseIntPipe) academicYear: number,
  ) {
    return this.subjectsService.getAvailableForGrade(gradeId, academicYear);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectsService.update(id, updateSubjectDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectsService.remove(id, currentUserId);
  }
}
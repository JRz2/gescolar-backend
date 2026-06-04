import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { SubjectAssignmentsService } from './subject-assignments.service';
import { CreateSubjectAssignmentDto } from './dto/create-subject-assignment.dto';
import { UpdateSubjectAssignmentDto } from './dto/update-subject-assignment.dto';
@Controller('subject-assignments')
export class SubjectAssignmentsController {
  constructor(private readonly subjectAssignmentsService: SubjectAssignmentsService) { }

  @Post()
  create(@Body() createDto: CreateSubjectAssignmentDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectAssignmentsService.create(createDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.subjectAssignmentsService.findAll();
  }

  @Get('available-years')
  getAvailableYears() {
    return this.subjectAssignmentsService.getAvailableYears();
  }

  @Get('by-grade/:gradeId')
  findByGrade(
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Query('academicYear', ParseIntPipe) academicYear: number,
  ) {
    return this.subjectAssignmentsService.findByGrade(gradeId, academicYear);
  }

  @Get('by-teacher/:teacherId')
  findByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query('academicYear') academicYear?: string,
  ) {
    const year = academicYear ? parseInt(academicYear) : undefined;
    return this.subjectAssignmentsService.findByTeacher(teacherId, year);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectAssignmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSubjectAssignmentDto,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectAssignmentsService.update(id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.subjectAssignmentsService.remove(id, currentUserId);
  }
}
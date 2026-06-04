import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { StudentGradesService } from './student-grades.service';
import { CreateStudentGradeDto } from './dto/create-student-grade.dto';
import { UpdateStudentGradeDto } from './dto/update-student-grade.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';

@Controller('student-grades')
export class StudentGradesController {
  constructor(private readonly studentGradesService: StudentGradesService) { }

  @Post()
  create(@Body() createDto: CreateStudentGradeDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentGradesService.create(createDto, currentUserId);
  }

  @Post('promote')
  promoteStudent(@Body() promoteDto: PromoteStudentDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentGradesService.promoteStudent(promoteDto, currentUserId);
  }

  @Post('promote-grade/:gradeId')
  promoteWholeGrade(
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Body() body: { academicYear: number; nextGradeId: number; nextAcademicYear: number },
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentGradesService.promoteWholeGrade(
      gradeId,
      body.academicYear,
      body.nextGradeId,
      body.nextAcademicYear,
      currentUserId,
    );
  }

  @Get()
  findAll() {
    return this.studentGradesService.findAll();
  }

  @Get('by-student/:studentId')
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.studentGradesService.findByStudent(studentId);
  }

  @Get('current/:studentId')
  findCurrentEnrollment(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.studentGradesService.findCurrentEnrollment(studentId);
  }

  @Get('check-passing')
  checkPassingStatus(
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('gradeId', ParseIntPipe) gradeId: number,
    @Query('academicYear', ParseIntPipe) academicYear: number,
  ) {
    return this.studentGradesService.checkPassingStatus(studentId, gradeId, academicYear);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentGradesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateStudentGradeDto,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentGradesService.update(id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentGradesService.remove(id, currentUserId);
  }
}
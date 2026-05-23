import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentsService.create(createStudentDto, currentUserId);
  }

  // ✅ Listar estudiantes por grado (NO todos)
  @Get('by-grade/:gradeId')
  findByGrade(
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Query('academicYear') academicYear?: string,
  ) {
    const year = academicYear ? parseInt(academicYear) : new Date().getFullYear();
    return this.studentsService.findByGrade(gradeId, year);
  }

  // Obtener detalle de un estudiante
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  // Actualizar estudiante
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentsService.update(id, updateStudentDto, currentUserId);
  }

  // Cambiar estado (activo/inactivo)
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentsService.changeStatus(id, isActive, currentUserId);
  }

  // Eliminar estudiante (soft delete)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.studentsService.remove(id, currentUserId);
  }
}
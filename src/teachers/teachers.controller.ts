import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) { }

  @Post()
  create(@Body() createTeacherDto: CreateTeacherDto) {
    // TODO: Obtener userId del token JWT (quien está creando)
    const currentUserId = 1; // Temporal
    return this.teachersService.create(createTeacherDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(+id);
  }

  @Get(':id/subjects')
  getTeacherSubjects(@Param('id') id: string) {
    return this.teachersService.getTeacherSubjects(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    // TODO: Obtener userId del token JWT
    const currentUserId = 1; // Temporal
    return this.teachersService.update(+id, updateTeacherDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // TODO: Obtener userId del token JWT
    const currentUserId = 1; // Temporal
    return this.teachersService.remove(+id, currentUserId);
  }
}
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { Level } from '@prisma/client';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) { }

  @Post()
  create(@Body() createGradeDto: CreateGradeDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.gradesService.create(createGradeDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.gradesService.findAll();
  }

  @Get('available-years')
  getAvailableYears() {
    return this.gradesService.getAvailableYears();
  }

  @Get('by-level/:level')
  findByLevel(
    @Param('level') level: Level,
    @Query('academicYear') academicYear?: string,
  ) {
    const year = academicYear ? parseInt(academicYear) : undefined;
    return this.gradesService.findByLevel(level, year);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.gradesService.update(id, updateGradeDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.gradesService.remove(id, currentUserId);
  }
}
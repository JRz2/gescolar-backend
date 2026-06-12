import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AcademicConfigService } from './academic-config.service';
import { CreateAcademicConfigDto } from './dto/create-academic-config.dto';
import { UpdateAcademicConfigDto } from './dto/update-academic-config.dto';

@Controller('academic-config')
export class AcademicConfigController {
  constructor(private readonly academicConfigService: AcademicConfigService) { }

  @Post()
  create(@Body() createDto: CreateAcademicConfigDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.academicConfigService.create(createDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.academicConfigService.findAll();
  }

  @Get('current')
  findCurrent() {
    return this.academicConfigService.findCurrent();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicConfigService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateAcademicConfigDto) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.academicConfigService.update(+id, updateDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const currentUserId = 1; // TODO: Obtener del token JWT
    return this.academicConfigService.remove(+id, currentUserId);
  }
}
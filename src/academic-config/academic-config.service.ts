import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicConfigDto } from './dto/create-academic-config.dto';
import { UpdateAcademicConfigDto } from './dto/update-academic-config.dto';

@Injectable()
export class AcademicConfigService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateAcademicConfigDto, createdBy?: number) {
    // Verificar si ya existe configuración para ese año
    const existing = await this.prisma.academicConfig.findUnique({
      where: { academicYear: createDto.academicYear },
    });

    if (existing) {
      throw new ConflictException(`Ya existe configuración para el año ${createDto.academicYear}`);
    }

    // Si esta nueva configuración es activa, desactivar otras
    if (createDto.isActive) {
      await this.prisma.academicConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const config = await this.prisma.academicConfig.create({
      data: createDto,
    });

    return config;
  }

  async findAll() {
    return this.prisma.academicConfig.findMany({
      orderBy: { academicYear: 'desc' },
    });
  }

  async findOne(id: number) {
    const config = await this.prisma.academicConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`Configuración con ID ${id} no encontrada`);
    }

    return config;
  }

  async findCurrent() {
    const config = await this.prisma.academicConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      throw new NotFoundException('No hay configuración académica activa');
    }

    return config;
  }

  async update(id: number, updateDto: UpdateAcademicConfigDto, updatedBy?: number) {
    await this.findOne(id);

    // Si se activa esta configuración, desactivar otras
    if (updateDto.isActive) {
      await this.prisma.academicConfig.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const config = await this.prisma.academicConfig.update({
      where: { id },
      data: updateDto,
    });

    return config;
  }

  async remove(id: number, deletedBy?: number) {
    await this.findOne(id);
    await this.prisma.academicConfig.delete({ where: { id } });
    return { message: `Configuración ${id} eliminada correctamente` };
  }
}
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationTypeDto } from './dto/create-evaluation-type.dto';
import { UpdateEvaluationTypeDto } from './dto/update-evaluation-type.dto';

@Injectable()
export class EvaluationTypesService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateEvaluationTypeDto, createdBy?: number) {
    const existing = await this.prisma.evaluationType.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un tipo de evaluación con nombre ${createDto.name}`);
    }

    return this.prisma.evaluationType.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.evaluationType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const type = await this.prisma.evaluationType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException(`Tipo de evaluación con ID ${id} no encontrado`);
    }
    return type;
  }

  async update(id: number, updateDto: UpdateEvaluationTypeDto, updatedBy?: number) {
    await this.findOne(id);
    return this.prisma.evaluationType.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, deletedBy?: number) {
    await this.findOne(id);
    await this.prisma.evaluationType.delete({ where: { id } });
    return { message: `Tipo de evaluación ${id} eliminado correctamente` };
  }
}
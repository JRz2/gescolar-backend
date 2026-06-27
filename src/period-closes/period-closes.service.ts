import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodCloseDto } from './dto/create-period-close.dto';
import { UpdatePeriodCloseDto } from './dto/update-period-close.dto';

@Injectable()
export class PeriodClosesService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreatePeriodCloseDto, closedBy?: number) {
    // Verificar que la asignación existe
    const assignment = await this.prisma.subjectAssignment.findUnique({
      where: { id: createDto.subjectAssignmentId },
      include: {
        subject: true,
        grade: true,
      },
    });
    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${createDto.subjectAssignmentId} no encontrada`);
    }

    // Verificar que no exista ya un cierre para este período
    const existingClose = await this.prisma.periodClose.findUnique({
      where: {
        subjectAssignmentId_period: {
          subjectAssignmentId: createDto.subjectAssignmentId,
          period: createDto.period,
        },
      },
    });

    if (existingClose) {
      throw new ConflictException(`El período ${createDto.period} ya está cerrado para esta materia`);
    }

    // Cerrar el período
    const periodClose = await this.prisma.periodClose.create({
      data: {
        subjectAssignmentId: createDto.subjectAssignmentId,
        period: createDto.period,
        closedBy,
      },
    });

    // Marcar todos los promedios del período como cerrados
    await this.prisma.periodAverage.updateMany({
      where: {
        subjectAssignmentId: createDto.subjectAssignmentId,
        period: createDto.period,
      },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy,
      },
    });

    // Marcar todos los componentes del período como cerrados
    await this.prisma.evaluationComponent.updateMany({
      where: {
        subjectAssignmentId: createDto.subjectAssignmentId,
        period: createDto.period,
      },
      data: {
        isClosed: true,
        closeDate: new Date(),
      },
    });

    return {
      ...periodClose,
      message: `Período ${createDto.period} cerrado exitosamente para la materia ${assignment.subject.name} en ${assignment.grade.name}`,
    };
  }

  async findAll() {
    const closes = await this.prisma.periodClose.findMany({
      include: {
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
            teacher: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: [
        { subjectAssignmentId: 'asc' },
        { period: 'asc' },
      ],
    });

    return closes.map(close => ({
      id: close.id,
      subjectAssignmentId: close.subjectAssignmentId,
      subject: close.subjectAssignment.subject.name,
      grade: close.subjectAssignment.grade.name,
      teacher: `${close.subjectAssignment.teacher.user.firstName} ${close.subjectAssignment.teacher.user.lastName}`,
      period: close.period,
      closedAt: close.closedAt,
      closedBy: close.closedBy,
    }));
  }

  async findOne(id: number) {
    const close = await this.prisma.periodClose.findUnique({
      where: { id },
      include: {
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
            teacher: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!close) {
      throw new NotFoundException(`Cierre con ID ${id} no encontrado`);
    }

    return close;
  }

  async findBySubjectAssignment(subjectAssignmentId: number) {
    const closes = await this.prisma.periodClose.findMany({
      where: { subjectAssignmentId },
      orderBy: { period: 'asc' },
    });

    return closes;
  }

  async checkPeriodStatus(subjectAssignmentId: number, period: number) {
    const close = await this.prisma.periodClose.findUnique({
      where: {
        subjectAssignmentId_period: {
          subjectAssignmentId,
          period,
        },
      },
    });

    const components = await this.prisma.evaluationComponent.findMany({
      where: {
        subjectAssignmentId,
        period,
      },
      select: {
        id: true,
        name: true,
        isClosed: true,
        scores: {
          select: { id: true },
        },
      },
    });

    const totalPercentage = components.reduce((sum, c) => sum + c.percentage, 0);
    const hasScores = components.some(c => c.scores.length > 0);

    return {
      subjectAssignmentId,
      period,
      isClosed: !!close,
      closedAt: close?.closedAt,
      totalComponents: components.length,
      totalPercentage,
      percentageComplete: totalPercentage,
      isValid: totalPercentage === 100,
      hasScores,
      components: components.map(c => ({
        name: c.name,
        isClosed: c.isClosed,
        hasScores: c.scores.length > 0,
      })),
    };
  }

  async update(id: number, updateDto: UpdatePeriodCloseDto, updatedBy?: number) {
    // No se permite actualizar un cierre, solo se puede abrir de nuevo (eliminar)
    throw new BadRequestException('No se puede actualizar un cierre. Use delete para abrir el período nuevamente');
  }

  async remove(id: number, deletedBy?: number) {
    const periodClose = await this.findOne(id);

    // Reabrir el período (eliminar cierre)
    await this.prisma.periodClose.delete({ where: { id } });

    // Marcar los promedios del período como no cerrados
    await this.prisma.periodAverage.updateMany({
      where: {
        subjectAssignmentId: periodClose.subjectAssignmentId,
        period: periodClose.period,
      },
      data: {
        isClosed: false,
        closedAt: null,
        closedBy: null,
      },
    });

    // Marcar los componentes del período como no cerrados
    await this.prisma.evaluationComponent.updateMany({
      where: {
        subjectAssignmentId: periodClose.subjectAssignmentId,
        period: periodClose.period,
      },
      data: {
        isClosed: false,
        closeDate: null,
      },
    });

    return { message: `Período ${periodClose.period} reabierto exitosamente` };
  }
}
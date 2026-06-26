import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodAverageDto } from './dto/create-period-average.dto';
import { UpdatePeriodAverageDto } from './dto/update-period-average.dto';

@Injectable()
export class PeriodAveragesService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreatePeriodAverageDto, createdBy?: number) {
    const average = await this.prisma.periodAverage.create({
      data: {
        studentId: createDto.studentId,
        subjectAssignmentId: createDto.subjectAssignmentId,
        period: createDto.period,
        average: createDto.average,
        percentage: createDto.percentage,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
          },
        },
      },
    });

    return average;
  }

  async findAll() {
    const averages = await this.prisma.periodAverage.findMany({
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
          },
        },
      },
      orderBy: [
        { subjectAssignmentId: 'asc' },
        { period: 'asc' },
      ],
    });

    return averages.map(avg => ({
      id: avg.id,
      studentId: avg.studentId,
      studentName: `${avg.student.user.firstName} ${avg.student.user.lastName}`,
      subjectAssignmentId: avg.subjectAssignmentId,
      subject: avg.subjectAssignment.subject.name,
      grade: avg.subjectAssignment.grade.name,
      period: avg.period,
      average: avg.average,
      percentage: avg.percentage,
      isClosed: avg.isClosed,
      closedAt: avg.closedAt,
    }));
  }

  async findOne(id: number) {
    const average = await this.prisma.periodAverage.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    if (!average) {
      throw new NotFoundException(`Promedio con ID ${id} no encontrado`);
    }

    return average;
  }

  async findByStudent(studentId: number, subjectAssignmentId?: number) {
    const where: any = { studentId };
    if (subjectAssignmentId) {
      where.subjectAssignmentId = subjectAssignmentId;
    }

    const averages = await this.prisma.periodAverage.findMany({
      where,
      include: {
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
          },
        },
      },
      orderBy: [
        { period: 'asc' },
      ],
    });

    // Calcular promedio final si todos los períodos están cerrados
    const totalPercentage = averages.reduce((sum, avg) => sum + (avg.percentage || 0), 0);
    const finalAverage = totalPercentage > 0
      ? averages.reduce((sum, avg) => sum + (avg.average * (avg.percentage / 100 || 1 / averages.length)), 0)
      : averages.reduce((sum, avg) => sum + avg.average, 0) / averages.length;

    return {
      studentId,
      periods: averages.map(avg => ({
        period: avg.period,
        subject: avg.subjectAssignment.subject.name,
        grade: avg.subjectAssignment.grade.name,
        average: avg.average,
        percentage: avg.percentage,
        isClosed: avg.isClosed,
      })),
      finalAverage: parseFloat(finalAverage.toFixed(2)),
      isComplete: averages.length > 0 && averages.every(avg => avg.isClosed),
    };
  }

  async findBySubjectAssignment(subjectAssignmentId: number) {
    const averages = await this.prisma.periodAverage.findMany({
      where: { subjectAssignmentId },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { period: 'asc' },
        { student: { user: { lastName: 'asc' } } },
      ],
    });

    // Agrupar por período
    const grouped: any = {};
    for (const avg of averages) {
      if (!grouped[avg.period]) {
        grouped[avg.period] = [];
      }
      grouped[avg.period].push({
        studentId: avg.studentId,
        studentName: `${avg.student.user.firstName} ${avg.student.user.lastName}`,
        average: avg.average,
        isClosed: avg.isClosed,
      });
    }

    return {
      subjectAssignmentId,
      periods: Object.keys(grouped).map(period => ({
        period: parseInt(period),
        students: grouped[period],
      })),
    };
  }

  async update(id: number, updateDto: UpdatePeriodAverageDto, updatedBy?: number) {
    await this.findOne(id);

    const average = await this.prisma.periodAverage.update({
      where: { id },
      data: {
        average: updateDto.average,
        percentage: updateDto.percentage,
      },
    });

    return average;
  }

  async closePeriod(id: number, closedBy?: number) {
    const average = await this.findOne(id);

    const updated = await this.prisma.periodAverage.update({
      where: { id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy,
      },
    });

    return updated;
  }

  async remove(id: number, deletedBy?: number) {
    await this.findOne(id);
    await this.prisma.periodAverage.delete({ where: { id } });
    return { message: `Promedio ${id} eliminado correctamente` };
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentScoreDto } from './dto/create-component-score.dto';
import { UpdateComponentScoreDto } from './dto/update-component-score.dto';
import { BatchComponentScoreDto } from './dto/batch-component-score.dto';

@Injectable()
export class ComponentScoresService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateComponentScoreDto, registeredBy?: number) {
    // Verificar que el estudiante existe
    const student = await this.prisma.student.findUnique({
      where: { id: createDto.studentId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${createDto.studentId} no encontrado`);
    }

    // Verificar que el componente existe
    const component = await this.prisma.evaluationComponent.findUnique({
      where: { id: createDto.evaluationComponentId },
      include: {
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
          },
        },
      },
    });
    if (!component) {
      throw new NotFoundException(`Componente con ID ${createDto.evaluationComponentId} no encontrado`);
    }

    // Verificar que el componente no esté cerrado
    if (component.isClosed) {
      throw new BadRequestException(`El componente "${component.name}" ya está cerrado y no permite modificar notas`);
    }

    // Verificar que la nota no exceda el maxScore
    if (createDto.score > component.maxScore) {
      throw new BadRequestException(`La nota no puede exceder ${component.maxScore} puntos`);
    }

    // Verificar si ya existe una nota para este estudiante y componente
    const existingScore = await this.prisma.componentScore.findUnique({
      where: {
        studentId_evaluationComponentId: {
          studentId: createDto.studentId,
          evaluationComponentId: createDto.evaluationComponentId,
        },
      },
    });

    let score;
    if (existingScore) {
      // Actualizar nota existente
      score = await this.prisma.componentScore.update({
        where: { id: existingScore.id },
        data: {
          score: createDto.score,
          observations: createDto.observations,
          registeredBy,
        },
      });
    } else {
      // Crear nueva nota
      score = await this.prisma.componentScore.create({
        data: {
          studentId: createDto.studentId,
          evaluationComponentId: createDto.evaluationComponentId,
          score: createDto.score,
          observations: createDto.observations,
          registeredBy,
        },
      });
    }

    // Recalcular promedio del período para este estudiante
    await this.recalculatePeriodAverage(
      createDto.studentId,
      component.subjectAssignmentId,
      component.period,
    );

    return score;
  }

  async batchCreate(batchDto: BatchComponentScoreDto, registeredBy?: number) {
    // Verificar que el componente existe
    const component = await this.prisma.evaluationComponent.findUnique({
      where: { id: batchDto.evaluationComponentId },
    });
    if (!component) {
      throw new NotFoundException(`Componente con ID ${batchDto.evaluationComponentId} no encontrado`);
    }

    // Verificar que el componente no esté cerrado
    if (component.isClosed) {
      throw new BadRequestException(`El componente "${component.name}" ya está cerrado y no permite modificar notas`);
    }

    const results = {
      total: batchDto.scores.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const scoreDto of batchDto.scores) {
      try {
        await this.create(scoreDto, registeredBy);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        results.errors.push(`Estudiante ${scoreDto.studentId}: ${errorMessage}`);
      }
    }

    return results;
  }

  async findAll() {
    const scores = await this.prisma.componentScore.findMany({
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
        evaluationComponent: {
          include: {
            evaluationType: true,
            subjectAssignment: {
              include: {
                subject: true,
                grade: true,
              },
            },
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
    });

    return scores.map(score => ({
      id: score.id,
      studentId: score.studentId,
      studentName: `${score.student.user.firstName} ${score.student.user.lastName}`,
      componentId: score.evaluationComponentId,
      componentName: score.evaluationComponent.name,
      componentType: score.evaluationComponent.evaluationType.name,
      subject: score.evaluationComponent.subjectAssignment.subject.name,
      grade: score.evaluationComponent.subjectAssignment.grade.name,
      period: score.evaluationComponent.period,
      score: score.score,
      maxScore: score.evaluationComponent.maxScore,
      observations: score.observations,
      registeredAt: score.registeredAt,
    }));
  }

  async findByStudent(studentId: number, subjectAssignmentId?: number) {
    const where: any = { studentId };
    if (subjectAssignmentId) {
      where.evaluationComponent = {
        subjectAssignmentId,
      };
    }

    const scores = await this.prisma.componentScore.findMany({
      where,
      include: {
        evaluationComponent: {
          include: {
            evaluationType: true,
            subjectAssignment: {
              include: {
                subject: true,
                grade: true,
              },
            },
          },
        },
      },
      orderBy: {
        evaluationComponent: {
          period: 'asc',
        },
      },
    });

    // Agrupar por período y materia
    const grouped: any = {};
    for (const score of scores) {
      const period = score.evaluationComponent.period;
      const subject = score.evaluationComponent.subjectAssignment.subject.name;
      const componentName = score.evaluationComponent.name;
      const componentType = score.evaluationComponent.evaluationType.name;

      if (!grouped[period]) {
        grouped[period] = { period, subjects: {} };
      }
      if (!grouped[period].subjects[subject]) {
        grouped[period].subjects[subject] = {
          subject,
          components: [],
          totalScore: 0,
          totalPercentage: 0,
        };
      }

      grouped[period].subjects[subject].components.push({
        name: componentName,
        type: componentType,
        score: score.score,
        maxScore: score.evaluationComponent.maxScore,
        percentage: score.evaluationComponent.percentage,
        observations: score.observations,
      });

      // Calcular contribución
      const contribution = (score.score / score.evaluationComponent.maxScore) * score.evaluationComponent.percentage;
      grouped[period].subjects[subject].totalScore += contribution;
      grouped[period].subjects[subject].totalPercentage += score.evaluationComponent.percentage;
    }

    // Calcular promedio por período
    for (const period in grouped) {
      for (const subject in grouped[period].subjects) {
        const subjectData = grouped[period].subjects[subject];
        subjectData.finalScore = subjectData.totalPercentage > 0
          ? (subjectData.totalScore / subjectData.totalPercentage) * 100
          : 0;
      }
    }

    return grouped;
  }

  async findByComponent(componentId: number) {
    const component = await this.prisma.evaluationComponent.findUnique({
      where: { id: componentId },
      include: {
        evaluationType: true,
        subjectAssignment: {
          include: {
            subject: true,
            grade: true,
          },
        },
      },
    });

    if (!component) {
      throw new NotFoundException(`Componente con ID ${componentId} no encontrado`);
    }

    // Obtener todos los estudiantes del grado (inscritos en el año actual)
    const currentYear = new Date().getFullYear();
    const students = await this.prisma.studentGrade.findMany({
      where: {
        gradeId: component.subjectAssignment.gradeId,
        academicYear: currentYear,
        status: 'ACTIVO',
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
      },
      orderBy: {
        student: {
          user: {
            lastName: 'asc',
          },
        },
      },
    });

    // Obtener calificaciones existentes
    const scores = await this.prisma.componentScore.findMany({
      where: { evaluationComponentId: componentId },
    });

    const scoreMap = new Map();
    for (const score of scores) {
      scoreMap.set(score.studentId, score);
    }

    return {
      component: {
        id: component.id,
        name: component.name,
        type: component.evaluationType.name,
        period: component.period,
        maxScore: component.maxScore,
        percentage: component.percentage,
        isClosed: component.isClosed,
      },
      subject: component.subjectAssignment.subject.name,
      grade: component.subjectAssignment.grade.name,
      students: students.map(enrollment => ({
        studentId: enrollment.studentId,
        studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
        uniqueCode: enrollment.student.uniqueCode,
        score: scoreMap.get(enrollment.studentId)?.score || null,
        scoreId: scoreMap.get(enrollment.studentId)?.id || null,
        observations: scoreMap.get(enrollment.studentId)?.observations || null,
      })),
    };
  }

  async findOne(id: number) {
    const score = await this.prisma.componentScore.findUnique({
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
        evaluationComponent: {
          include: {
            evaluationType: true,
            subjectAssignment: {
              include: {
                subject: true,
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!score) {
      throw new NotFoundException(`Calificación con ID ${id} no encontrada`);
    }

    return score;
  }

  async update(id: number, updateDto: UpdateComponentScoreDto, registeredBy?: number) {
    const existingScore = await this.findOne(id);

    // Verificar que el componente no esté cerrado
    const component = await this.prisma.evaluationComponent.findUnique({
      where: { id: existingScore.evaluationComponentId },
    });

    if (!component) {
      throw new NotFoundException(`Componente con ID ${existingScore.evaluationComponentId} no encontrado`);
    }

    if (component.isClosed) {
      throw new BadRequestException(`El componente "${component.name}" ya está cerrado y no permite modificar notas`);
    }

    // Verificar que la nota no exceda el maxScore
    if (updateDto.score && updateDto.score > component.maxScore) {
      throw new BadRequestException(`La nota no puede exceder ${component.maxScore} puntos`);
    }

    const score = await this.prisma.componentScore.update({
      where: { id },
      data: {
        score: updateDto.score,
        observations: updateDto.observations,
        registeredBy,
      },
    });

    // Recalcular promedio del período
    await this.recalculatePeriodAverage(
      existingScore.studentId,
      component.subjectAssignmentId,
      component.period,
    );

    return score;
  }

  async remove(id: number, deletedBy?: number) {
    const score = await this.findOne(id);

    const component = await this.prisma.evaluationComponent.findUnique({
      where: { id: score.evaluationComponentId },
    });

    if (!component) {
      throw new NotFoundException(`Componente con ID ${score.evaluationComponentId} no encontrado`);
    }

    if (component.isClosed) {
      throw new BadRequestException(`El componente "${component.name}" ya está cerrado y no permite eliminar notas`);
    }

    await this.prisma.componentScore.delete({ where: { id } });

    // Recalcular promedio del período
    await this.recalculatePeriodAverage(
      score.studentId,
      component.subjectAssignmentId,
      component.period,
    );

    return { message: `Calificación ${id} eliminada correctamente` };
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private async recalculatePeriodAverage(studentId: number, subjectAssignmentId: number, period: number) {
    // Obtener todos los componentes del período
    const components = await this.prisma.evaluationComponent.findMany({
      where: {
        subjectAssignmentId,
        period,
      },
    });

    if (components.length === 0) {
      return;
    }

    // Obtener todas las calificaciones del estudiante para estos componentes
    const scores = await this.prisma.componentScore.findMany({
      where: {
        studentId,
        evaluationComponentId: {
          in: components.map(c => c.id),
        },
      },
    });

    const scoreMap = new Map();
    for (const score of scores) {
      scoreMap.set(score.evaluationComponentId, score);
    }

    // Calcular promedio ponderado
    let totalWeightedScore = 0;
    let totalPercentage = 0;

    for (const component of components) {
      const score = scoreMap.get(component.id);
      if (score) {
        const normalizedScore = (score.score / component.maxScore) * 100;
        const weightedContribution = normalizedScore * (component.percentage / 100);
        totalWeightedScore += weightedContribution;
        totalPercentage += component.percentage;
      }
    }

    const average = totalPercentage > 0 ? totalWeightedScore : 0;

    // Guardar o actualizar el promedio del período
    await this.prisma.periodAverage.upsert({
      where: {
        studentId_subjectAssignmentId_period: {
          studentId,
          subjectAssignmentId,
          period,
        },
      },
      update: {
        average,
      },
      create: {
        studentId,
        subjectAssignmentId,
        period,
        average,
      },
    });
  }
}
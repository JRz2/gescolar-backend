import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentGradeDto } from './dto/create-student-grade.dto';
import { UpdateStudentGradeDto } from './dto/update-student-grade.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { StudentGradeStatus } from '@prisma/client';

// Configuración de aprobación
const PASSING_SCORE = 51; // Nota mínima para aprobar (ej: 51/100)
const MAX_FAILED_SUBJECTS = 3; // Máximo de materias reprobadas permitidas

// Definir el tipo de retorno de checkIfStudentPassed
export interface PassingResult {
  passed: boolean;
  average: number;
  failedSubjects: number;
  reason?: string;
}

@Injectable()
export class StudentGradesService {
  constructor(private prisma: PrismaService) { }

  // ============================================
  // VERIFICAR SI ESTUDIANTE APROBÓ EL AÑO
  // ============================================
  private async checkIfStudentPassed(
    studentId: number,
    gradeId: number,
    academicYear: number,
  ): Promise<PassingResult> {
    // Obtener todas las asignaciones (materias) del grado en ese año
    const subjectAssignments = await this.prisma.subjectAssignment.findMany({
      where: {
        gradeId,
        academicYear,
      },
      include: {
        subject: true,
      },
    });

    if (subjectAssignments.length === 0) {
      return {
        passed: false,
        average: 0,
        failedSubjects: 0,
        reason: 'El grado no tiene materias asignadas para ese año',
      };
    }

    // Obtener todas las calificaciones del estudiante para esas materias
    const scores = await this.prisma.score.findMany({
      where: {
        studentId,
        subjectAssignmentId: {
          in: subjectAssignments.map(sa => sa.id),
        },
      },
    });

    // Calcular promedio por materia (tomando el mejor trimestre o el final)
    const subjectScores: { [key: number]: { scores: number[]; finalScore?: number } } = {};

    for (const score of scores) {
      if (!subjectScores[score.subjectAssignmentId]) {
        subjectScores[score.subjectAssignmentId] = { scores: [] };
      }
      if (score.trimester === 0) {
        // Nota final
        subjectScores[score.subjectAssignmentId].finalScore = score.value;
      } else {
        subjectScores[score.subjectAssignmentId].scores.push(score.value);
      }
    }

    // Calcular nota final por materia (priorizar nota final si existe)
    const finalScores: number[] = [];
    let failedCount = 0;

    for (const assignment of subjectAssignments) {
      const subjectScore = subjectScores[assignment.id];
      let finalScore: number | null = null;

      if (subjectScore?.finalScore !== undefined) {
        finalScore = subjectScore.finalScore;
      } else if (subjectScore?.scores.length > 0) {
        // Promedio de trimestres
        finalScore = subjectScore.scores.reduce((a, b) => a + b, 0) / subjectScore.scores.length;
      }

      if (finalScore !== null) {
        finalScores.push(finalScore);
        if (finalScore < PASSING_SCORE) {
          failedCount++;
        }
      } else {
        // No tiene calificaciones, considerar como reprobado
        failedCount++;
      }
    }

    if (finalScores.length === 0) {
      return {
        passed: false,
        average: 0,
        failedSubjects: subjectAssignments.length,
        reason: 'El estudiante no tiene calificaciones registradas',
      };
    }

    const average = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    const passed = average >= PASSING_SCORE && failedCount <= MAX_FAILED_SUBJECTS;

    let reason: string | undefined;
    if (!passed) {
      if (average < PASSING_SCORE) {
        reason = `Promedio insuficiente: ${average.toFixed(2)} (mínimo ${PASSING_SCORE})`;
      } else if (failedCount > MAX_FAILED_SUBJECTS) {
        reason = `Demasiadas materias reprobadas: ${failedCount}/${subjectAssignments.length} (máximo ${MAX_FAILED_SUBJECTS})`;
      }
    }

    return {
      passed,
      average: parseFloat(average.toFixed(2)),
      failedSubjects: failedCount,
      reason,
    };
  }

  // ============================================
  // OBTENER EL SIGUIENTE GRADO (basado en nivel)
  // ============================================
  private async getNextGrade(currentGradeId: number, academicYear: number): Promise<any | null> {
    const currentGrade = await this.prisma.grade.findUnique({
      where: { id: currentGradeId },
    });

    if (!currentGrade) {
      return null;
    }

    // Lógica simple: buscar por nombre +1
    const currentName = currentGrade.name;
    const match = currentName.match(/^(\d+)/);

    if (match) {
      const currentNumber = parseInt(match[1]);
      const nextNumber = currentNumber + 1;
      const nextGrade = await this.prisma.grade.findFirst({
        where: {
          name: { startsWith: nextNumber.toString() },
          level: currentGrade.level,
          academicYear,
        },
      });
      return nextGrade;
    }

    return null;
  }

  // ============================================
  // INSCRIBIR ESTUDIANTE A UN GRADO
  // ============================================
  async create(createDto: CreateStudentGradeDto, createdBy?: number) {
    // Verificar que el estudiante existe
    const student = await this.prisma.student.findUnique({
      where: { id: createDto.studentId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${createDto.studentId} no encontrado`);
    }

    // Verificar que el grado existe
    const grade = await this.prisma.grade.findUnique({
      where: { id: createDto.gradeId },
    });
    if (!grade) {
      throw new NotFoundException(`Grado con ID ${createDto.gradeId} no encontrado`);
    }

    // Verificar que no tenga ya una inscripción para ese año
    const existingEnrollment = await this.prisma.studentGrade.findFirst({
      where: {
        studentId: createDto.studentId,
        academicYear: createDto.academicYear,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        `El estudiante ya tiene una inscripción para el año ${createDto.academicYear}`,
      );
    }

    // Verificar si está inscribiendo al siguiente año (no el actual)
    const currentYear = new Date().getFullYear();
    if (createDto.academicYear > currentYear) {
      // Inscripción para el próximo año: verificar que aprobó el año actual
      const lastEnrollment = await this.prisma.studentGrade.findFirst({
        where: {
          studentId: createDto.studentId,
          academicYear: createDto.academicYear - 1,
        },
        orderBy: { academicYear: 'desc' },
      });

      if (lastEnrollment) {
        const result = await this.checkIfStudentPassed(
          createDto.studentId,
          lastEnrollment.gradeId,
          lastEnrollment.academicYear,
        );

        if (!result.passed && createDto.status !== StudentGradeStatus.SUSPENDIDO) {
          throw new BadRequestException(
            `El estudiante no puede inscribirse al siguiente año. ${result.reason || 'No cumple los requisitos'}. ` +
            `Promedio: ${result.average}, Materias reprobadas: ${result.failedSubjects}`,
          );
        }
      }
    }

    // Crear inscripción
    const enrollment = await this.prisma.studentGrade.create({
      data: {
        studentId: createDto.studentId,
        gradeId: createDto.gradeId,
        academicYear: createDto.academicYear,
        status: createDto.status || StudentGradeStatus.ACTIVO,
      },
      include: {
        student: {
          include: { user: true },
        },
        grade: true,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_ENROLLMENT',
        entity: 'StudentGrade',
        entityId: enrollment.id.toString(),
        newValue: {
          student: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
          grade: enrollment.grade.name,
          academicYear: enrollment.academicYear,
        },
      },
    });

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      gradeId: enrollment.gradeId,
      gradeName: enrollment.grade.name,
      academicYear: enrollment.academicYear,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
    };
  }

  // ============================================
  // PROMOVER ESTUDIANTE AL SIGUIENTE AÑO
  // ============================================
  async promoteStudent(promoteDto: PromoteStudentDto, createdBy?: number) {
    const { studentId, currentGradeId, currentAcademicYear, nextGradeId, nextAcademicYear, forcePromotion } = promoteDto;

    // Verificar que el estudiante existe
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${studentId} no encontrado`);
    }

    // Verificar inscripción actual
    const currentEnrollment = await this.prisma.studentGrade.findFirst({
      where: {
        studentId,
        gradeId: currentGradeId,
        academicYear: currentAcademicYear,
      },
    });

    if (!currentEnrollment) {
      throw new NotFoundException(
        `No se encontró inscripción para el estudiante en grado ${currentGradeId} año ${currentAcademicYear}`,
      );
    }

    // Verificar si aprobó (a menos que sea forzado)
    let passedInfo: PassingResult = { passed: true, average: 0, failedSubjects: 0 };
    if (!forcePromotion) {
      passedInfo = await this.checkIfStudentPassed(studentId, currentGradeId, currentAcademicYear);
      if (!passedInfo.passed) {
        throw new BadRequestException(
          `El estudiante no cumple los requisitos para ser promovido. ${passedInfo.reason || 'No aprobó el año'}`,
        );
      }
    }

    // Verificar que no tenga inscripción para el próximo año
    const existingNextEnrollment = await this.prisma.studentGrade.findFirst({
      where: {
        studentId,
        academicYear: nextAcademicYear,
      },
    });

    if (existingNextEnrollment) {
      throw new ConflictException(
        `El estudiante ya tiene una inscripción para el año ${nextAcademicYear}`,
      );
    }

    // Verificar que el grado destino existe
    const nextGrade = await this.prisma.grade.findUnique({
      where: { id: nextGradeId },
    });
    if (!nextGrade) {
      throw new NotFoundException(`Grado destino con ID ${nextGradeId} no encontrado`);
    }

    // Marcar inscripción actual como EGRESADO
    await this.prisma.studentGrade.update({
      where: { id: currentEnrollment.id },
      data: { status: StudentGradeStatus.EGRESADO },
    });

    // Crear nueva inscripción
    const newEnrollment = await this.prisma.studentGrade.create({
      data: {
        studentId,
        gradeId: nextGradeId,
        academicYear: nextAcademicYear,
        status: StudentGradeStatus.ACTIVO,
      },
      include: {
        grade: true,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'PROMOTE_STUDENT',
        entity: 'StudentGrade',
        entityId: newEnrollment.id.toString(),
        newValue: {
          student: `${student.user.firstName} ${student.user.lastName}`,
          fromGrade: currentEnrollment.gradeId,
          toGrade: nextGradeId,
          fromYear: currentAcademicYear,
          toYear: nextAcademicYear,
          passed: passedInfo.passed,
          average: passedInfo.average,
          forced: forcePromotion || false,
        },
      },
    });

    return {
      message: forcePromotion && !passedInfo.passed
        ? `Estudiante promovido FORZOSAMENTE (no cumplía requisitos)`
        : `Estudiante promovido exitosamente`,
      student: `${student.user.firstName} ${student.user.lastName}`,
      fromGrade: currentEnrollment.gradeId,
      toGrade: nextGrade.name,
      fromYear: currentAcademicYear,
      toYear: nextAcademicYear,
      promotionDetails: {
        passed: passedInfo.passed,
        average: passedInfo.average,
        failedSubjects: passedInfo.failedSubjects,
        forced: forcePromotion || false,
      },
    };
  }

  // ============================================
  // PROMOVER CURSO COMPLETO (todos los estudiantes de un grado)
  // ============================================
  async promoteWholeGrade(
    gradeId: number,
    academicYear: number,
    nextGradeId: number,
    nextAcademicYear: number,
    createdBy?: number,
  ) {
    // Obtener todos los estudiantes activos del grado
    const enrollments = await this.prisma.studentGrade.findMany({
      where: {
        gradeId,
        academicYear,
        status: StudentGradeStatus.ACTIVO,
      },
      include: {
        student: true,
      },
    });

    const results = {
      total: enrollments.length,
      promoted: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const enrollment of enrollments) {
      try {
        const passedInfo = await this.checkIfStudentPassed(
          enrollment.studentId,
          gradeId,
          academicYear,
        );

        if (passedInfo.passed) {
          await this.promoteStudent(
            {
              studentId: enrollment.studentId,
              currentGradeId: gradeId,
              currentAcademicYear: academicYear,
              nextGradeId,
              nextAcademicYear,
              forcePromotion: false,
            },
            createdBy,
          );
          results.promoted++;
        } else {
          results.failed++;
          results.errors.push(
            `Estudiante ${enrollment.studentId}: ${passedInfo.reason || 'No aprobó el año'}`,
          );
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        results.errors.push(
          `Estudiante ${enrollment.studentId}: ${errorMessage}`,
        );
      }
    }

    return results;
  }

  // ============================================
  // CRUD BÁSICO
  // ============================================

  async findAll() {
    const enrollments = await this.prisma.studentGrade.findMany({
      include: {
        student: {
          include: { user: true },
        },
        grade: true,
      },
      orderBy: [
        { academicYear: 'desc' },
        { grade: { name: 'asc' } },
      ],
    });

    return enrollments.map(e => ({
      id: e.id,
      studentId: e.studentId,
      studentName: `${e.student.user.firstName} ${e.student.user.lastName}`,
      gradeId: e.gradeId,
      gradeName: e.grade.name,
      academicYear: e.academicYear,
      status: e.status,
      enrollmentDate: e.enrollmentDate,
    }));
  }

  async findByStudent(studentId: number) {
    const enrollments = await this.prisma.studentGrade.findMany({
      where: { studentId },
      include: {
        grade: true,
      },
      orderBy: { academicYear: 'desc' },
    });

    return enrollments.map(e => ({
      id: e.id,
      gradeId: e.gradeId,
      gradeName: e.grade.name,
      academicYear: e.academicYear,
      status: e.status,
      enrollmentDate: e.enrollmentDate,
    }));
  }

  async findCurrentEnrollment(studentId: number) {
    const currentYear = new Date().getFullYear();
    const enrollment = await this.prisma.studentGrade.findFirst({
      where: {
        studentId,
        academicYear: currentYear,
        status: StudentGradeStatus.ACTIVO,
      },
      include: {
        grade: true,
      },
    });

    return enrollment
      ? {
        id: enrollment.id,
        gradeId: enrollment.gradeId,
        gradeName: enrollment.grade.name,
        academicYear: enrollment.academicYear,
        status: enrollment.status,
      }
      : null;
  }

  async findOne(id: number) {
    const enrollment = await this.prisma.studentGrade.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true },
        },
        grade: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Inscripción con ID ${id} no encontrada`);
    }

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      gradeId: enrollment.gradeId,
      gradeName: enrollment.grade.name,
      academicYear: enrollment.academicYear,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
    };
  }

  async update(id: number, updateDto: UpdateStudentGradeDto, updatedBy?: number) {
    await this.findOne(id);

    const enrollment = await this.prisma.studentGrade.update({
      where: { id },
      data: {
        status: updateDto.status,
        gradeId: updateDto.gradeId,
        academicYear: updateDto.academicYear,
      },
      include: {
        student: {
          include: { user: true },
        },
        grade: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_ENROLLMENT',
        entity: 'StudentGrade',
        entityId: id.toString(),
        newValue: {
          status: enrollment.status,
          grade: enrollment.grade.name,
        },
      },
    });

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      gradeId: enrollment.gradeId,
      gradeName: enrollment.grade.name,
      academicYear: enrollment.academicYear,
      status: enrollment.status,
    };
  }

  async remove(id: number, deletedBy?: number) {
    const enrollment = await this.findOne(id);

    await this.prisma.studentGrade.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_ENROLLMENT',
        entity: 'StudentGrade',
        entityId: id.toString(),
        oldValue: {
          studentId: enrollment.studentId,
          academicYear: enrollment.academicYear,
        },
      },
    });

    return { message: `Inscripción ${id} eliminada correctamente` };
  }

  // Obtener verificación de aprobación (para mostrar al docente/admin)
  async checkPassingStatus(studentId: number, gradeId: number, academicYear: number) {
    const result = await this.checkIfStudentPassed(studentId, gradeId, academicYear);
    return result;
  }
}
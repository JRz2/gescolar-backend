import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectAssignmentDto } from './dto/create-subject-assignment.dto';
import { UpdateSubjectAssignmentDto } from './dto/update-subject-assignment.dto';

@Injectable()
export class SubjectAssignmentsService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateSubjectAssignmentDto, createdBy?: number) {
    // Verificar que el grado existe
    const grade = await this.prisma.grade.findUnique({
      where: { id: createDto.gradeId },
    });
    if (!grade) {
      throw new NotFoundException(`Grado con ID ${createDto.gradeId} no encontrado`);
    }

    // Verificar que la materia existe
    const subject = await this.prisma.subject.findUnique({
      where: { id: createDto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException(`Materia con ID ${createDto.subjectId} no encontrada`);
    }

    // Verificar que el docente existe
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createDto.teacherId },
      include: { user: true },
    });
    if (!teacher) {
      throw new NotFoundException(`Docente con ID ${createDto.teacherId} no encontrado`);
    }

    // Verificar que no exista una asignación duplicada
    const existingAssignment = await this.prisma.subjectAssignment.findFirst({
      where: {
        gradeId: createDto.gradeId,
        subjectId: createDto.subjectId,
        academicYear: createDto.academicYear,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `Ya existe una asignación de la materia "${subject.name}" en el grado "${grade.name}" para el año ${createDto.academicYear}`,
      );
    }

    // Crear la asignación
    const assignment = await this.prisma.subjectAssignment.create({
      data: {
        gradeId: createDto.gradeId,
        subjectId: createDto.subjectId,
        teacherId: createDto.teacherId,
        academicYear: createDto.academicYear,
      },
      include: {
        grade: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_SUBJECT_ASSIGNMENT',
        entity: 'SubjectAssignment',
        entityId: assignment.id.toString(),
        newValue: {
          grade: assignment.grade.name,
          subject: assignment.subject.name,
          teacher: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
          academicYear: assignment.academicYear,
        },
      },
    });

    return {
      id: assignment.id,
      gradeId: assignment.gradeId,
      gradeName: assignment.grade.name,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      teacherId: assignment.teacherId,
      teacherName: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
      academicYear: assignment.academicYear,
    };
  }

  async findAll() {
    const assignments = await this.prisma.subjectAssignment.findMany({
      include: {
        grade: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { grade: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      gradeId: assignment.gradeId,
      gradeName: assignment.grade.name,
      gradeLevel: assignment.grade.level,
      gradeShift: assignment.grade.shift,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      teacherId: assignment.teacherId,
      teacherName: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
      academicYear: assignment.academicYear,
    }));
  }

  async findOne(id: number) {
    const assignment = await this.prisma.subjectAssignment.findUnique({
      where: { id },
      include: {
        grade: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    return {
      id: assignment.id,
      gradeId: assignment.gradeId,
      gradeName: assignment.grade.name,
      gradeLevel: assignment.grade.level,
      gradeAcademicYear: assignment.grade.academicYear,
      gradeShift: assignment.grade.shift,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      subjectWorkload: assignment.subject.workload,
      teacherId: assignment.teacherId,
      teacherName: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
      teacherEmail: assignment.teacher.user.email,
      academicYear: assignment.academicYear,
    };
  }

  async update(id: number, updateDto: UpdateSubjectAssignmentDto, updatedBy?: number) {
    // Verificar que existe
    await this.findOne(id);

    // Si cambia el grado, verificar que existe
    if (updateDto.gradeId) {
      const grade = await this.prisma.grade.findUnique({
        where: { id: updateDto.gradeId },
      });
      if (!grade) {
        throw new NotFoundException(`Grado con ID ${updateDto.gradeId} no encontrado`);
      }
    }

    // Si cambia la materia, verificar que existe
    if (updateDto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: updateDto.subjectId },
      });
      if (!subject) {
        throw new NotFoundException(`Materia con ID ${updateDto.subjectId} no encontrada`);
      }
    }

    // Si cambia el docente, verificar que existe
    if (updateDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateDto.teacherId },
      });
      if (!teacher) {
        throw new NotFoundException(`Docente con ID ${updateDto.teacherId} no encontrado`);
      }
    }

    const assignment = await this.prisma.subjectAssignment.update({
      where: { id },
      data: {
        gradeId: updateDto.gradeId,
        subjectId: updateDto.subjectId,
        teacherId: updateDto.teacherId,
        academicYear: updateDto.academicYear,
      },
      include: {
        grade: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_SUBJECT_ASSIGNMENT',
        entity: 'SubjectAssignment',
        entityId: id.toString(),
        newValue: {
          grade: assignment.grade.name,
          subject: assignment.subject.name,
          teacher: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
        },
      },
    });

    return {
      id: assignment.id,
      gradeId: assignment.gradeId,
      gradeName: assignment.grade.name,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      teacherId: assignment.teacherId,
      teacherName: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
      academicYear: assignment.academicYear,
    };
  }

  async remove(id: number, deletedBy?: number) {
    const assignment = await this.findOne(id);

    // Verificar si tiene calificaciones asociadas
    const scores = await this.prisma.score.findMany({
      where: { subjectAssignmentId: id },
      take: 1,
    });

    if (scores.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la asignación porque ya tiene calificaciones registradas`,
      );
    }

    await this.prisma.subjectAssignment.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_SUBJECT_ASSIGNMENT',
        entity: 'SubjectAssignment',
        entityId: id.toString(),
        oldValue: {
          grade: assignment.gradeName,
          subject: assignment.subjectName,
          academicYear: assignment.academicYear,
        },
      },
    });

    return { message: `Asignación ${id} eliminada correctamente` };
  }

  // Obtener asignaciones por grado y año
  async findByGrade(gradeId: number, academicYear: number) {
    const assignments = await this.prisma.subjectAssignment.findMany({
      where: {
        gradeId,
        academicYear,
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        subject: {
          name: 'asc',
        },
      },
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      subjectId: assignment.subject.id,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      subjectWorkload: assignment.subject.workload,
      teacherId: assignment.teacher.id,
      teacherName: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
    }));
  }

  // Obtener asignaciones por docente
  async findByTeacher(teacherId: number, academicYear?: number) {
    const where: any = { teacherId };
    if (academicYear) {
      where.academicYear = academicYear;
    }

    const assignments = await this.prisma.subjectAssignment.findMany({
      where,
      include: {
        grade: true,
        subject: true,
      },
      orderBy: [
        { academicYear: 'desc' },
        { grade: { name: 'asc' } },
      ],
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      gradeId: assignment.grade.id,
      gradeName: assignment.grade.name,
      gradeLevel: assignment.grade.level,
      gradeShift: assignment.grade.shift,
      subjectId: assignment.subject.id,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      academicYear: assignment.academicYear,
    }));
  }

  // Obtener años lectivos disponibles
  async getAvailableYears() {
    const years = await this.prisma.subjectAssignment.findMany({
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    });

    return years.map(y => y.academicYear);
  }
}
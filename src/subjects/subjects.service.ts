import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) { }

  async create(createSubjectDto: CreateSubjectDto, createdBy?: number) {
    // Verificar si ya existe una materia con el mismo código
    const existingSubject = await this.prisma.subject.findUnique({
      where: { code: createSubjectDto.code },
    });

    if (existingSubject) {
      throw new ConflictException(`Ya existe una materia con el código ${createSubjectDto.code}`);
    }

    const subject = await this.prisma.subject.create({
      data: {
        code: createSubjectDto.code,
        name: createSubjectDto.name,
        workload: createSubjectDto.workload,
        year: createSubjectDto.year,
        description: createSubjectDto.description,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_SUBJECT',
        entity: 'Subject',
        entityId: subject.id.toString(),
        newValue: {
          code: subject.code,
          name: subject.name,
          year: subject.year,
        },
      },
    });

    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      year: subject.year,
      description: subject.description,
    };
  }

  async findAll() {
    const subjects = await this.prisma.subject.findMany({
      include: {
        subjectAssignments: {
          include: {
            grade: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                level: true,
              },
            },
            teacher: {
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
        },
      },
      orderBy: [
        { year: 'asc' },
        { name: 'asc' },
      ],
    });

    return subjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      year: subject.year,
      description: subject.description,
      totalAssignments: subject.subjectAssignments.length,
      assignments: subject.subjectAssignments.map(sa => ({
        gradeId: sa.grade.id,
        gradeName: sa.grade.name,
        academicYear: sa.grade.academicYear,
        teacher: sa.teacher.user
          ? `${sa.teacher.user.firstName} ${sa.teacher.user.lastName}`
          : 'Sin asignar',
      })),
    }));
  }

  async findOne(id: number) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        subjectAssignments: {
          include: {
            grade: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                level: true,
                shift: true,
              },
            },
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      year: subject.year,
      description: subject.description,
      assignments: subject.subjectAssignments.map(sa => ({
        id: sa.id,
        gradeId: sa.grade.id,
        gradeName: sa.grade.name,
        academicYear: sa.grade.academicYear,
        level: sa.grade.level,
        shift: sa.grade.shift,
        teacherId: sa.teacher.id,
        teacherName: sa.teacher.user
          ? `${sa.teacher.user.firstName} ${sa.teacher.user.lastName}`
          : 'Sin asignar',
        teacherEmail: sa.teacher.user?.email,
      })),
    };
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto, updatedBy?: number) {
    await this.findOne(id);

    // Si se actualiza el código, verificar que no esté en uso
    if (updateSubjectDto.code) {
      const existingSubject = await this.prisma.subject.findFirst({
        where: {
          code: updateSubjectDto.code,
          id: { not: id },
        },
      });

      if (existingSubject) {
        throw new ConflictException(`Ya existe una materia con el código ${updateSubjectDto.code}`);
      }
    }

    const subject = await this.prisma.subject.update({
      where: { id },
      data: {
        code: updateSubjectDto.code,
        name: updateSubjectDto.name,
        workload: updateSubjectDto.workload,
        year: updateSubjectDto.year,
        description: updateSubjectDto.description,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_SUBJECT',
        entity: 'Subject',
        entityId: id.toString(),
        newValue: {
          code: subject.code,
          name: subject.name,
        },
      },
    });

    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      year: subject.year,
      description: subject.description,
    };
  }

  async remove(id: number, deletedBy?: number) {
    const subject = await this.findOne(id);

    // Verificar si tiene asignaciones (está siendo usada en algún grado)
    if (subject.assignments.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la materia porque está asignada a ${subject.assignments.length} grado(s)`,
      );
    }

    await this.prisma.subject.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_SUBJECT',
        entity: 'Subject',
        entityId: id.toString(),
        oldValue: {
          code: subject.code,
          name: subject.name,
        },
      },
    });

    return { message: `Materia ${id} eliminada correctamente` };
  }

  // Obtener materias por año de carrera
  async findByYear(year: number) {
    const subjects = await this.prisma.subject.findMany({
      where: { year },
      orderBy: { name: 'asc' },
    });

    return subjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      description: subject.description,
    }));
  }

  // Obtener materias disponibles para un grado específico
  async getAvailableForGrade(gradeId: number, academicYear: number) {
    // Obtener materias ya asignadas a este grado
    const assignedSubjects = await this.prisma.subjectAssignment.findMany({
      where: {
        gradeId: gradeId,
        academicYear: academicYear,
      },
      select: { subjectId: true },
    });

    const assignedIds = assignedSubjects.map(s => s.subjectId);

    // Obtener materias no asignadas
    const availableSubjects = await this.prisma.subject.findMany({
      where: {
        id: { notIn: assignedIds },
      },
      orderBy: [
        { year: 'asc' },
        { name: 'asc' },
      ],
    });

    return availableSubjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      year: subject.year,
      workload: subject.workload,
    }));
  }

  // Obtener años disponibles de materias
  async getAvailableYears() {
    const years = await this.prisma.subject.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'asc' },
    });

    return years.map(y => y.year);
  }
}
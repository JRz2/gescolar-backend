import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { Level } from '@prisma/client';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) { }

  // Generar nombre automático basado en nivel, número y sección
  private generateGradeName(level: Level, gradeNumber: number, section?: string): string {
    let prefix = '';

    switch (level) {
      case Level.PRIMARIO:
        prefix = `${gradeNumber}º de Primaria`;
        break;
      case Level.SECUNDARIO:
        prefix = `${gradeNumber}º de Secundaria`;
        break;
      case Level.UNIVERSITARIO:
        prefix = `${gradeNumber}º Año`;
        break;
    }

    return section ? `${prefix} ${section}` : prefix;
  }

  async create(createGradeDto: CreateGradeDto, createdBy?: number) {
    // Generar nombre si no se proporcionó
    const name = createGradeDto.name || this.generateGradeName(
      createGradeDto.level,
      createGradeDto.gradeNumber,
      createGradeDto.section,
    );

    // Verificar si ya existe un grado con el mismo nombre, año y turno
    const existingGrade = await this.prisma.grade.findFirst({
      where: {
        name,
        academicYear: createGradeDto.academicYear,
        shift: createGradeDto.shift,
      },
    });

    if (existingGrade) {
      throw new ConflictException(
        `Ya existe un grado con nombre "${name}" para el año ${createGradeDto.academicYear} en turno ${createGradeDto.shift}`,
      );
    }

    const grade = await this.prisma.grade.create({
      data: {
        name,
        level: createGradeDto.level,
        academicYear: createGradeDto.academicYear,
        shift: createGradeDto.shift,
        description: createGradeDto.description,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_GRADE',
        entity: 'Grade',
        entityId: grade.id.toString(),
        newValue: {
          name: grade.name,
          level: grade.level,
          academicYear: grade.academicYear,
          shift: grade.shift,
        },
      },
    });

    return grade;
  }

  async findAll() {
    const grades = await this.prisma.grade.findMany({
      include: {
        subjectAssignments: {
          include: {
            subject: true,
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
        enrollments: {
          where: {
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
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { level: 'asc' },
        { name: 'asc' },
      ],
    });

    return grades.map(grade => ({
      id: grade.id,
      name: grade.name,
      level: grade.level,
      academicYear: grade.academicYear,
      shift: grade.shift,
      description: grade.description,
      totalStudents: grade.enrollments.length,
      totalSubjects: grade.subjectAssignments.length,
      students: grade.enrollments.map(e => ({
        id: e.student.id,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        uniqueCode: e.student.uniqueCode,
      })),
      subjects: grade.subjectAssignments.map(sa => ({
        id: sa.subject.id,
        name: sa.subject.name,
        code: sa.subject.code,
        teacher: sa.teacher.user
          ? `${sa.teacher.user.firstName} ${sa.teacher.user.lastName}`
          : 'Sin asignar',
      })),
    }));
  }

  async findOne(id: number) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        subjectAssignments: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    ci: true,
                    phone: true,
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
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(`Grado con ID ${id} no encontrado`);
    }

    return {
      id: grade.id,
      name: grade.name,
      level: grade.level,
      academicYear: grade.academicYear,
      shift: grade.shift,
      description: grade.description,
      totalStudents: grade.enrollments.length,
      totalSubjects: grade.subjectAssignments.length,
      students: grade.enrollments.map(e => ({
        id: e.student.id,
        enrollmentId: e.id,
        uniqueCode: e.student.uniqueCode,
        enrollmentNumber: e.student.enrollmentNumber,
        firstName: e.student.user.firstName,
        lastName: e.student.user.lastName,
        email: e.student.user.email,
        ci: e.student.user.ci,
        phone: e.student.user.phone,
        guardianName: e.student.guardianName,
        guardianPhone: e.student.guardianPhone,
        status: e.status,
        enrollmentDate: e.enrollmentDate,
      })),
      subjects: grade.subjectAssignments.map(sa => ({
        id: sa.id,
        subjectId: sa.subject.id,
        subjectName: sa.subject.name,
        subjectCode: sa.subject.code,
        workload: sa.subject.workload,
        teacherId: sa.teacher.id,
        teacherName: sa.teacher.user
          ? `${sa.teacher.user.firstName} ${sa.teacher.user.lastName}`
          : 'Sin asignar',
        teacherEmail: sa.teacher.user?.email,
        academicYear: sa.academicYear,
      })),
    };
  }

  async update(id: number, updateGradeDto: UpdateGradeDto, updatedBy?: number) {
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no haya conflicto
    if (updateGradeDto.name) {
      const existingGrade = await this.prisma.grade.findFirst({
        where: {
          name: updateGradeDto.name,
          academicYear: updateGradeDto.academicYear,
          shift: updateGradeDto.shift,
          id: { not: id },
        },
      });

      if (existingGrade) {
        throw new ConflictException(
          `Ya existe un grado con nombre "${updateGradeDto.name}" para el año ${updateGradeDto.academicYear}`,
        );
      }
    }

    const grade = await this.prisma.grade.update({
      where: { id },
      data: {
        name: updateGradeDto.name,
        level: updateGradeDto.level,
        academicYear: updateGradeDto.academicYear,
        shift: updateGradeDto.shift,
        description: updateGradeDto.description,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_GRADE',
        entity: 'Grade',
        entityId: id.toString(),
        newValue: { name: grade.name, academicYear: grade.academicYear },
      },
    });

    return grade;
  }

  async remove(id: number, deletedBy?: number) {
    const grade = await this.findOne(id);

    // Verificar si tiene estudiantes inscritos
    if (grade.totalStudents > 0) {
      throw new ConflictException(
        `No se puede eliminar el grado porque tiene ${grade.totalStudents} estudiantes inscritos`,
      );
    }

    await this.prisma.grade.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_GRADE',
        entity: 'Grade',
        entityId: id.toString(),
        oldValue: { name: grade.name, academicYear: grade.academicYear },
      },
    });

    return { message: `Grado ${id} eliminado correctamente` };
  }

  // Obtener grados por nivel
  async findByLevel(level: Level, academicYear?: number) {
    const year = academicYear || new Date().getFullYear();

    const grades = await this.prisma.grade.findMany({
      where: {
        level,
        academicYear: year,
      },
      include: {
        enrollments: {
          where: { status: 'ACTIVO' },
          select: { id: true },
        },
        subjectAssignments: {
          select: { id: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return grades.map(grade => ({
      id: grade.id,
      name: grade.name,
      shift: grade.shift,
      totalStudents: grade.enrollments.length,
      totalSubjects: grade.subjectAssignments.length,
    }));
  }

  // Obtener grados disponibles para un año lectivo
  async getAvailableYears() {
    const years = await this.prisma.grade.findMany({
      select: {
        academicYear: true,
      },
      distinct: ['academicYear'],
      orderBy: {
        academicYear: 'desc',
      },
    });

    return years.map(y => y.academicYear);
  }
}
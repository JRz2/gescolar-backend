import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserRole, StudentGradeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueCode(): Promise<string> {
    const lastStudent = await this.prisma.student.findFirst({
      orderBy: { uniqueCode: 'desc' },
    });
    const nextCode = lastStudent ? (parseInt(lastStudent.uniqueCode) + 1).toString() : '1001';
    return nextCode;
  }

  private generateEnrollmentNumber(uniqueCode: string, year: number): string {
    return `${year}-${uniqueCode}`;
  }

  async create(createStudentDto: CreateStudentDto, createdBy?: number) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createStudentDto.email },
          { ci: createStudentDto.ci },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El email o CI ya está registrado');
    }

    const admissionYear = createStudentDto.admissionYear || new Date().getFullYear();
    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);
    const uniqueCode = await this.generateUniqueCode();
    const enrollmentNumber = this.generateEnrollmentNumber(uniqueCode, admissionYear);

    // Crear usuario y estudiante
    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: createStudentDto.email,
          password: hashedPassword,
          firstName: createStudentDto.firstName,
          lastName: createStudentDto.lastName,
          ci: createStudentDto.ci,
          phone: createStudentDto.phone,
          address: createStudentDto.address,
          role: UserRole.ESTUDIANTE,
          createdBy,
        },
      });

      const studentRecord = await tx.student.create({
        data: {
          userId: user.id,
          uniqueCode,
          enrollmentNumber,
          birthDate: createStudentDto.birthDate,
          guardianName: createStudentDto.guardianName,
          guardianPhone: createStudentDto.guardianPhone,
          admissionYear,
        },
      });

      return { user, studentRecord };
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_STUDENT',
        entity: 'Student',
        entityId: student.studentRecord.id.toString(),
        newValue: {
          email: student.user.email,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          uniqueCode: student.studentRecord.uniqueCode,
        },
      },
    });

    return {
      id: student.studentRecord.id,
      email: student.user.email,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      ci: student.user.ci,
      phone: student.user.phone,
      address: student.user.address,
      uniqueCode: student.studentRecord.uniqueCode,
      enrollmentNumber: student.studentRecord.enrollmentNumber,
      birthDate: student.studentRecord.birthDate,
      guardianName: student.studentRecord.guardianName,
      guardianPhone: student.studentRecord.guardianPhone,
      admissionYear: student.studentRecord.admissionYear,
      isActive: student.user.isActive,
    };
  }

  // Listar estudiantes por grado y año lectivo
  async findByGrade(gradeId: number, academicYear: number) {
    // Verificar que el grado existe
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grado con ID ${gradeId} no encontrado`);
    }
    // Obtener estudiantes inscritos en ese grado y año
    const enrollments = await this.prisma.studentGrade.findMany({
      where: {
        gradoId: gradeId,
        academicYear,
        status: StudentGradeStatus.ACTIVO,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                ci: true,
                phone: true,
                address: true,
                isActive: true,
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

    return {
      grade: {
        id: grade.id,
        name: grade.name,
        level: grade.level,
        shift: grade.shift,
      },
      academicYear,
      totalStudents: enrollments.length,
      students: enrollments.map(e => ({
        id: e.student.id,
        enrollmentId: e.id,
        uniqueCode: e.student.uniqueCode,
        enrollmentNumber: e.student.enrollmentNumber,
        firstName: e.student.user.firstName,
        lastName: e.student.user.lastName,
        email: e.student.user.email,
        ci: e.student.user.ci,
        phone: e.student.user.phone,
        address: e.student.user.address,
        birthDate: e.student.birthDate,
        guardianName: e.student.guardianName,
        guardianPhone: e.student.guardianPhone,
        isActive: e.student.user.isActive,
        enrollmentDate: e.enrollmentDate,
      })),
    };
  }

  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            ci: true,
            phone: true,
            address: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        enrollments: {
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
          },
          orderBy: {
            academicYear: 'desc',
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
    }

    // Obtener inscripción actual (año en curso)
    const currentYear = new Date().getFullYear();
    const currentEnrollment = student.enrollments.find(e => e.academicYear === currentYear);

    return {
      id: student.id,
      email: student.user.email,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      ci: student.user.ci,
      phone: student.user.phone,
      address: student.user.address,
      uniqueCode: student.uniqueCode,
      enrollmentNumber: student.enrollmentNumber,
      birthDate: student.birthDate,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      admissionYear: student.admissionYear,
      isActive: student.user.isActive,
      createdAt: student.user.createdAt,
      updatedAt: student.user.updatedAt,
      currentGrade: currentEnrollment ? {
        id: currentEnrollment.grade.id,
        name: currentEnrollment.grade.name,
        academicYear: currentEnrollment.grade.academicYear,
        level: currentEnrollment.grade.level,
        shift: currentEnrollment.grade.shift,
        enrollmentDate: currentEnrollment.enrollmentDate,
        status: currentEnrollment.status,
      } : null,
      history: student.enrollments.map(e => ({
        id: e.id,
        gradeId: e.grade.id,
        gradeName: e.grade.name,
        academicYear: e.academicYear,
        level: e.grade.level,
        shift: e.grade.shift,
        status: e.status,
        enrollmentDate: e.enrollmentDate,
      })),
    };
  }

  async update(id: number, updateStudentDto: UpdateStudentDto, updatedBy?: number) {
    const student = await this.findOne(id);

    const userData: any = {};
    const studentData: any = {};

    if (updateStudentDto.email) userData.email = updateStudentDto.email;
    if (updateStudentDto.firstName) userData.firstName = updateStudentDto.firstName;
    if (updateStudentDto.lastName) userData.lastName = updateStudentDto.lastName;
    if (updateStudentDto.ci) userData.ci = updateStudentDto.ci;
    if (updateStudentDto.phone) userData.phone = updateStudentDto.phone;
    if (updateStudentDto.address) userData.address = updateStudentDto.address;
    if (updateStudentDto.password) {
      userData.password = await bcrypt.hash(updateStudentDto.password, 10);
    }

    if (updateStudentDto.birthDate) studentData.birthDate = updateStudentDto.birthDate;
    if (updateStudentDto.guardianName) studentData.guardianName = updateStudentDto.guardianName;
    if (updateStudentDto.guardianPhone) studentData.guardianPhone = updateStudentDto.guardianPhone;

    userData.updatedBy = updatedBy;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: student.id },
          data: userData,
        });
      }

      if (Object.keys(studentData).length > 0) {
        await tx.student.update({
          where: { id },
          data: studentData,
        });
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_STUDENT',
        entity: 'Student',
        entityId: id.toString(),
        newValue: { id, updatedFields: Object.keys(updateStudentDto) },
      },
    });

    return this.findOne(id);
  }

  // Cambiar estado (activo/inactivo)
  async changeStatus(id: number, isActive: boolean, updatedBy?: number) {
    const student = await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id: student.id },
      data: { isActive, updatedBy },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: isActive ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
        entity: 'Student',
        entityId: id.toString(),
        newValue: { isActive },
      },
    });

    return {
      id,
      isActive: updated.isActive,
      message: `Estudiante ${isActive ? 'activado' : 'desactivado'} correctamente`,
    };
  }

  async remove(id: number, deletedBy?: number) {
    const student = await this.findOne(id);

    await this.prisma.user.update({
      where: { id: student.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_STUDENT',
        entity: 'Student',
        entityId: id.toString(),
        oldValue: { email: student.email, uniqueCode: student.uniqueCode },
      },
    });

    return { message: `Estudiante ${id} eliminado correctamente` };
  }
}
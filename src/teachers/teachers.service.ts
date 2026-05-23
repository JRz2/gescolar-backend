import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) { }

  async create(createTeacherDto: CreateTeacherDto, createdBy?: number) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createTeacherDto.email },
          { ci: createTeacherDto.ci },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El email o CI ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(createTeacherDto.password, 10);

    // Crear usuario y docente en transacción
    const teacher = await this.prisma.$transaction(async (tx) => {
      // Crear el usuario con rol DOCENTE
      const user = await tx.user.create({
        data: {
          email: createTeacherDto.email,
          password: hashedPassword,
          firstName: createTeacherDto.firstName,
          lastName: createTeacherDto.lastName,
          ci: createTeacherDto.ci,
          phone: createTeacherDto.phone,
          address: createTeacherDto.address,
          role: UserRole.DOCENTE,
          createdBy,
        },
      });

      // Crear el registro de docente
      const teacherRecord = await tx.teacher.create({
        data: {
          userId: user.id,
          specialty: createTeacherDto.specialty,
          degree: createTeacherDto.degree,
        },
      });

      return { user, teacherRecord };
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_TEACHER',
        entity: 'Teacher',
        entityId: teacher.teacherRecord.id.toString(),
        newValue: {
          email: teacher.user.email,
          firstName: teacher.user.firstName,
          lastName: teacher.user.lastName,
          specialty: createTeacherDto.specialty,
        },
      },
    });

    return {
      id: teacher.teacherRecord.id,
      email: teacher.user.email,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      ci: teacher.user.ci,
      phone: teacher.user.phone,
      address: teacher.user.address,
      specialty: teacher.teacherRecord.specialty,
      degree: teacher.teacherRecord.degree,
      hiringDate: teacher.teacherRecord.hiringDate,
      isActive: teacher.user.isActive,
    };
  }

  async findAll() {
    const teachers = await this.prisma.teacher.findMany({
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
          },
        },
        subjectAssignments: {
          include: {
            grade: {
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
    });

    return teachers.map(teacher => ({
      id: teacher.id,
      email: teacher.user.email,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      ci: teacher.user.ci,
      phone: teacher.user.phone,
      address: teacher.user.address,
      specialty: teacher.specialty,
      degree: teacher.degree,
      hiringDate: teacher.hiringDate,
      isActive: teacher.user.isActive,
      createdAt: teacher.user.createdAt,
      subjects: teacher.subjectAssignments.map(sa => ({
        grade: sa.grade.name,
        subject: sa.subject.name,
        academicYear: sa.academicYear,
      })),
    }));
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
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
        subjectAssignments: {
          include: {
            grade: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                shift: true,
              },
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                workload: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    return {
      id: teacher.id,
      email: teacher.user.email,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      ci: teacher.user.ci,
      phone: teacher.user.phone,
      address: teacher.user.address,
      specialty: teacher.specialty,
      degree: teacher.degree,
      hiringDate: teacher.hiringDate,
      isActive: teacher.user.isActive,
      createdAt: teacher.user.createdAt,
      updatedAt: teacher.user.updatedAt,
      subjects: teacher.subjectAssignments.map(sa => ({
        gradeId: sa.grade.id,
        gradeName: sa.grade.name,
        subjectId: sa.subject.id,
        subjectName: sa.subject.name,
        subjectCode: sa.subject.code,
        academicYear: sa.academicYear,
        shift: sa.grade.shift,
      })),
    };
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto, updatedBy?: number) {
    // Verificar si existe
    const teacher = await this.findOne(id);

    // Preparar datos para actualizar
    const userData: any = {};
    const teacherData: any = {};

    if (updateTeacherDto.email) userData.email = updateTeacherDto.email;
    if (updateTeacherDto.firstName) userData.firstName = updateTeacherDto.firstName;
    if (updateTeacherDto.lastName) userData.lastName = updateTeacherDto.lastName;
    if (updateTeacherDto.ci) userData.ci = updateTeacherDto.ci;
    if (updateTeacherDto.phone) userData.phone = updateTeacherDto.phone;
    if (updateTeacherDto.address) userData.address = updateTeacherDto.address;
    if (updateTeacherDto.isActive !== undefined) userData.isActive = updateTeacherDto.isActive;
    if (updateTeacherDto.password) {
      userData.password = await bcrypt.hash(updateTeacherDto.password, 10);
    }

    if (updateTeacherDto.specialty) teacherData.specialty = updateTeacherDto.specialty;
    if (updateTeacherDto.degree) teacherData.degree = updateTeacherDto.degree;

    userData.updatedBy = updatedBy;

    // Actualizar en transacción
    const updatedTeacher = await this.prisma.$transaction(async (tx) => {
      // Actualizar usuario
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: teacher.id },
          data: userData,
        });
      }

      // Actualizar docente
      const updated = await tx.teacher.update({
        where: { id },
        data: teacherData,
        include: {
          user: true,
        },
      });

      return updated;
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_TEACHER',
        entity: 'Teacher',
        entityId: id.toString(),
        newValue: {
          email: updatedTeacher.user.email,
          specialty: updateTeacherDto.specialty,
        },
      },
    });

    return this.findOne(id);
  }

  async remove(id: number, deletedBy?: number) {
    // Verificar si existe
    const teacher = await this.findOne(id);

    // Soft delete
    const deletedTeacher = await this.prisma.$transaction(async (tx) => {
      // Desactivar usuario (soft delete)
      const user = await tx.user.update({
        where: { id: teacher.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      return user;
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_TEACHER',
        entity: 'Teacher',
        entityId: id.toString(),
        oldValue: {
          email: deletedTeacher.email,
          firstName: deletedTeacher.firstName,
          lastName: deletedTeacher.lastName,
        },
      },
    });

    return { message: `Docente ${id} eliminado correctamente` };
  }

  // Método adicional: obtener materias que dicta un docente
  async getTeacherSubjects(teacherId: number) {
    const teacher = await this.findOne(teacherId);

    return teacher.subjects;
  }
}
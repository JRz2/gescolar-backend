import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // Roles permitidos en este módulo
  private readonly allowedRoles: UserRole[] = ['ADMIN', 'DIRECTOR', 'SECRETARIA'];


  async create(createUserDto: CreateUserDto, createdBy?: number) {
    // Verificar que el rol sea permitido en este módulo
    if (!this.allowedRoles.includes(createUserDto.role)) {
      throw new BadRequestException(
        `Este módulo solo permite crear: ${this.allowedRoles.join(', ')}. Para ${createUserDto.role} use el módulo correspondiente.`
      );
    }

    // Verificar si ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { ci: createUserDto.ci },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El email o CI ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        ci: createUserDto.ci,
        phone: createUserDto.phone,
        address: createUserDto.address,
        role: createUserDto.role,
        createdBy,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ci: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id.toString(),
        newValue: { email: user.email, role: user.role },
      },
    });

    return user;
  }

  async findAll() {
    // Solo usuarios con rol ADMIN, DIRECTOR o SECRETARIA
    return this.prisma.user.findMany({
      where: {
        role: {
          in: this.allowedRoles,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ci: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: this.allowedRoles,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ci: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, updatedBy?: number) {
    // Verificar si existe
    await this.findOne(id);

    // Si intenta cambiar el rol, validar que sea permitido
    if (updateUserDto.role && !this.allowedRoles.includes(updateUserDto.role)) {
      throw new BadRequestException(
        `No se puede cambiar a rol ${updateUserDto.role}. Use el módulo correspondiente.`
      );
    }

    // Preparar datos
    const data: any = {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      phone: updateUserDto.phone,
      address: updateUserDto.address,
      isActive: updateUserDto.isActive,
      updatedBy,
    };

    // Si se actualiza email, verificar que no esté en uso
    if (updateUserDto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });
      if (existingEmail) {
        throw new ConflictException('El email ya está en uso');
      }
      data.email = updateUserDto.email;
    }

    // Si se actualiza CI, verificar que no esté en uso
    if (updateUserDto.ci) {
      const existingCi = await this.prisma.user.findFirst({
        where: {
          ci: updateUserDto.ci,
          id: { not: id },
        },
      });
      if (existingCi) {
        throw new ConflictException('El CI ya está en uso');
      }
      data.ci = updateUserDto.ci;
    }

    // Si se actualiza rol
    if (updateUserDto.role) {
      data.role = updateUserDto.role;
    }

    // Si se actualiza contraseña, hashearla
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Actualizar
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ci: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id.toString(),
        newValue: { email: user.email, role: user.role },
      },
    });

    return user;
  }

  async remove(id: number, deletedBy?: number) {
    // Verificar si existe
    await this.findOne(id);

    // Soft delete
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id.toString(),
        oldValue: { email: user.email, role: user.role },
      },
    });

    return { message: `Usuario ${id} eliminado correctamente` };
  }
}
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { ci: dto.ci },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El email o CI ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Crear usuario transaccionalmente
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          ci: dto.ci,
          phone: dto.phone,
          address: dto.address,
          role: dto.role,
        },
      });

      // Si es estudiante, crear registro en Student
      if (dto.role === UserRole.ESTUDIANTE) {
        // Generar registro único automático (1001, 1002...)
        const lastStudent = await tx.student.findFirst({
          orderBy: { uniqueCode: 'desc' },
        });
        const nextCode = lastStudent
          ? (parseInt(lastStudent.uniqueCode) + 1).toString()
          : '1001';

        await tx.student.create({
          data: {
            userId: newUser.id,
            uniqueCode: nextCode,
            enrollmentNumber: `L${new Date().getFullYear()}-${nextCode}`,
            birthDate: dto.birthDate,
            guardianName: dto.guardianName,
            guardianPhone: dto.guardianPhone,
            admissionYear: new Date().getFullYear(),
          },
        });
      }

      // Si es docente, crear registro en Teacher
      if (dto.role === UserRole.DOCENTE) {
        await tx.teacher.create({
          data: {
            userId: newUser.id,
            specialty: dto.specialty,
            degree: dto.degree,
          },
        });
      }

      return newUser;
    });

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entity: 'User',
        entityId: user.id.toString(),
        newValue: { email: user.email, role: user.role },
      },
    });

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Registrar intento fallido
      await this.registerLoginAttempt(dto.email, false, ipAddress, userAgent, 'user_not_found');
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.registerLoginAttempt(dto.email, false, ipAddress, userAgent, 'wrong_password');
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar si está activo
    if (!user.isActive) {
      await this.registerLoginAttempt(dto.email, false, ipAddress, userAgent, 'account_inactive');
      throw new UnauthorizedException('Cuenta desactivada');
    }

    // Registrar intento exitoso
    await this.registerLoginAttempt(dto.email, true, ipAddress, userAgent, null);

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id.toString(),
        newValue: { email: user.email },
      },
    });

    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: dto.refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Revocar la sesión actual
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Generar nuevos tokens
    const tokens = await this.generateTokens(session.user.id, session.user.email, session.user.role);

    return tokens;
  }

  async logout(userId: number, refreshToken: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        refreshToken,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId.toString(),
      },
    });

    return { message: 'Logout exitoso' };
  }

  private async generateTokens(userId: number, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      secret: this.configService.get('JWT_SECRET'),
    });

    const refreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    let expiresAt = new Date();

    if (refreshExpiresIn === '7d') {
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else {
      expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(refreshExpiresIn));
    }

    // Guardar refresh token en la base de datos
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    };
  }

  private async registerLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    await this.prisma.loginAttempt.create({
      data: {
        email,
        userId: user?.id,
        success,
        ipAddress,
        userAgent,
        failureReason,
      },
    });
  }
}
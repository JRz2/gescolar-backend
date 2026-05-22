import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Ip } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './strategies/guards/jwt-auth.guard';


// Definir la interfaz para el usuario del request
interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    const userAgent = request.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard) // Usamos el guard para proteger la ruta
  async logout(@Req() request: RequestWithUser, @Body('refreshToken') refreshToken: string) {
    const userId = request.user.id;
    return this.authService.logout(userId, refreshToken);
  }
}
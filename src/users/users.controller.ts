import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // TODO: Obtener userId del token JWT
    const currentUserId = 1; // Temporal
    return this.usersService.create(createUserDto, currentUserId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // TODO: Obtener userId del token JWT
    const currentUserId = 1; // Temporal
    return this.usersService.update(+id, updateUserDto, currentUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // TODO: Obtener userId del token JWT
    const currentUserId = 1; // Temporal
    return this.usersService.remove(+id, currentUserId);
  }
}
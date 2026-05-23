import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateTeacherDto {
    @IsEmail({}, { message: 'Email inválido' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @MaxLength(50)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    })
    password: string;

    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    firstName: string;

    @IsString()
    @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    lastName: string;

    @IsString()
    @MinLength(5, { message: 'CI inválido' })
    ci: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    specialty?: string;  

    @IsString()
    @IsOptional()
    degree?: string;  
}
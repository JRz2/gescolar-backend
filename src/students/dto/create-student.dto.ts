import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches, IsDateString, IsInt, Min, Max } from 'class-validator';

export class CreateStudentDto {
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

    @IsDateString()
    @IsOptional()
    birthDate?: Date;

    @IsString()
    @IsOptional()
    guardianName?: string;  // Nombre del tutor/padre

    @IsString()
    @IsOptional()
    guardianPhone?: string;  // Teléfono del tutor

    @IsInt()
    @Min(1900)
    @Max(new Date().getFullYear())
    @IsOptional()
    admissionYear?: number;  // Año de ingreso (por defecto año actual)
}
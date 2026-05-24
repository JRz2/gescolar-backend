import { IsString, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Level, Shift } from '@prisma/client';

export class CreateGradeDto {
    @IsString()
    @IsOptional()
    name?: string;  // Ej: "1ro A", "2do B" - se autogenera si no se envía

    @IsEnum(Level, { message: 'Nivel inválido' })
    level: Level;

    @IsInt()
    @Min(2000)
    @Max(2100)
    academicYear: number;

    @IsEnum(Shift, { message: 'Turno inválido' })
    shift: Shift;

    @IsString()
    @IsOptional()
    description?: string;

    // Para autogenerar nombre
    @IsInt()
    @Min(1)
    @Max(12)
    gradeNumber: number;  // 1, 2, 3, 4, 5, 6 (para primaria) o 1-6 para secundaria

    @IsString()
    @IsOptional()
    section?: string;  // A, B, C, D (para paralelo)
}
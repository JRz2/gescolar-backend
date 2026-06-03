import { IsString, IsInt, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateSubjectDto {
    @IsString()
    @Length(3, 20, { message: 'El código debe tener entre 3 y 20 caracteres' })
    code: string;  // Ej: "MAT101", "PROG202"

    @IsString()
    @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
    name: string;  // Ej: "Matemática I", "Programación"

    @IsInt()
    @Min(1)
    @Max(500)
    @IsOptional()
    workload?: number;  // Carga horaria total (horas)

    @IsInt()
    @Min(1)
    @Max(12)
    year: number;  // Año de la carrera: 1, 2, 3, 4...

    @IsString()
    @IsOptional()
    @Length(0, 500)
    description?: string;
}
import { IsInt, IsBoolean, IsOptional } from 'class-validator';

export class PromoteStudentDto {
  @IsInt()
  studentId: number;

  @IsInt()
  currentGradeId: number;

  @IsInt()
  currentAcademicYear: number;

  @IsInt()
  nextGradeId: number;  // Siguiente grado (puede ser el mismo si repite)

  @IsInt()
  nextAcademicYear: number;

  @IsBoolean()
  @IsOptional()
  forcePromotion?: boolean;  // Para admin que quiera forzar aunque no cumpla requisitos
}
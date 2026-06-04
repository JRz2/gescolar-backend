import { IsInt, Max, Min } from "class-validator";

export class CreateSubjectAssignmentDto {
    @IsInt()
    gradeId: number;

    @IsInt()
    subjectId: number;

    @IsInt()
    teacherId: number;

    @IsInt()
    @Min(2000)
    @Max(2100)
    academicYear: number;
}

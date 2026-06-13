import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudentsModule } from './students/students.module';
import { GradesModule } from './grades/grades.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SubjectAssignmentsModule } from './subject-assignments/subject-assignments.module';
import { StudentGradesModule } from './student-grades/student-grades.module';
import { AcademicConfigModule } from './academic-config/academic-config.module';
import { EvaluationTypesModule } from './evaluation-types/evaluation-types.module';
import { ComponentScoresModule } from './component-scores/component-scores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TeachersModule,
    StudentsModule,
    GradesModule,
    SubjectsModule,
    SubjectAssignmentsModule,
    StudentGradesModule,
    AcademicConfigModule,
    EvaluationTypesModule,
    ComponentScoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

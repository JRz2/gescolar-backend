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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

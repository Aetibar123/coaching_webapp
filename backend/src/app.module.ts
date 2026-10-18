import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { StudentModule } from './student/student.module';
import { BatchModule } from './batch/batch.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ProfileModule } from './profile/profile.module';
import { TeacherModule } from './teacher/teacher.module';
import { ClassModule } from './class/class.module';
import { AssignmentModule } from './assignment/assignment.module';

import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    StudentModule,
    BatchModule,
    AttendanceModule,
    ProfileModule,
    TeacherModule,
    ClassModule,
    AssignmentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

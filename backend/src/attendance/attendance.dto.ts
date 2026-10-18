import {
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentAttendanceItemDto {
  @ValidateIf((o: StudentAttendanceItemDto) => !o.studentId)
  @IsNotEmpty({ message: 'student_id is required' })
  student_id?: string | number;

  @ValidateIf((o: StudentAttendanceItemDto) => !o.student_id)
  @IsNotEmpty({ message: 'studentId is required' })
  studentId?: string | number;

  @IsString()
  @IsNotEmpty({ message: 'status is required' })
  status!: string;
}

export class SubmitAttendanceDto {
  @ValidateIf((o: SubmitAttendanceDto) => !o.batchId)
  @IsNotEmpty({ message: 'batch_id is required' })
  batch_id?: string | number;

  @ValidateIf((o: SubmitAttendanceDto) => !o.batch_id)
  @IsNotEmpty({ message: 'batchId is required' })
  batchId?: string | number;

  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  date!: string;

  @ValidateIf((o: SubmitAttendanceDto) => !o.records)
  @IsArray({ message: 'students must be an array' })
  @ArrayNotEmpty({ message: 'students array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceItemDto)
  students?: StudentAttendanceItemDto[];

  @ValidateIf((o: SubmitAttendanceDto) => !o.students)
  @IsOptional()
  @IsArray({ message: 'records must be an array' })
  @ArrayNotEmpty({ message: 'records array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceItemDto)
  records?: StudentAttendanceItemDto[];
}

export class QueryAttendanceDto {
  @IsOptional()
  @IsString()
  batch_id?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  student_id?: string;
}

export class AttendanceAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  batch_id?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: string; // 'students' | 'daily' | 'detailed'

  @IsOptional()
  @IsString()
  teacher_email?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

// Aliases for convenience
export { SubmitAttendanceDto as CreateAttendanceDto };
export { StudentAttendanceItemDto as StudentAttendanceDto };

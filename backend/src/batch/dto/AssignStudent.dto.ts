import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignStudentDto {
  @IsNotEmpty()
  student_id!: string | number;
}

export class BatchQueryDto {
  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

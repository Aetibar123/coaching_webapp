import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty({ message: 'batch_id is required' })
  batch_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'date is required (YYYY-MM-DD)' })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: 'start_time is required (HH:MM)' })
  start_time!: string;

  @IsString()
  @IsNotEmpty({ message: 'end_time is required (HH:MM)' })
  end_time!: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  meeting_link?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  meeting_link?: string;

  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'rescheduled', 'completed', 'cancelled'])
  status?: string;
}

export class RescheduleClassDto {
  @IsString()
  @IsNotEmpty({ message: 'New date is required (YYYY-MM-DD)' })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: 'New start_time is required (HH:MM)' })
  start_time!: string;

  @IsString()
  @IsNotEmpty({ message: 'New end_time is required (HH:MM)' })
  end_time!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  meeting_link?: string;
}

export class QueryClassDto {
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
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  teacher_email?: string;

  @IsOptional()
  @IsString()
  student_id?: string;
}


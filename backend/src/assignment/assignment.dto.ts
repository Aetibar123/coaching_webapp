import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class McqQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Question text is required' })
  question_text!: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Each question must have at least 2 options' })
  @IsString({ each: true })
  options!: string[];

  @IsNumber()
  @Min(0, { message: 'Correct option index must be 0 or higher' })
  correct_option!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number = 1;
}

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Batch ID is required' })
  batch_id!: string;

  @IsOptional()
  @IsString()
  class_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Assignment title is required' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Assignment must have at least 1 question' })
  @ValidateNested({ each: true })
  @Type(() => McqQuestionDto)
  questions!: McqQuestionDto[];
}

export class StudentAnswerItemDto {
  @IsString()
  @IsNotEmpty()
  question_id!: string;

  @IsNumber()
  @Min(0)
  selected_option!: number;
}

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Student ID is required' })
  student_id!: string;

  @IsOptional()
  @IsString()
  student_email?: string;

  @IsOptional()
  @IsString()
  student_name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerItemDto)
  answers!: StudentAnswerItemDto[];
}

export class QueryAssignmentDto {
  @IsOptional()
  @IsString()
  batch_id?: string;

  @IsOptional()
  @IsString()
  class_id?: string;

  @IsOptional()
  @IsString()
  teacher_email?: string;
}


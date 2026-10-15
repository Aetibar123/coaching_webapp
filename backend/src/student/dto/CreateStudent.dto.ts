import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsNumber()
  phone_number!: number;

  @IsNumber()
  age!: number;

  @IsString()
  gender!: string;

  @IsOptional()
  batch_id?: string | number;
}
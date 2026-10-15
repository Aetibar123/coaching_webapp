import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './CreateStudent.dto';

// PartialType automatically sari fields ko optional (@IsOptional) bana deta hai
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

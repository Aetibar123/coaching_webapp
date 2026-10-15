import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/CreateStudent.dto';
import { UpdateStudentDto } from './dto/UpdateStudent.dto';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  createStudent(@Body() data: CreateStudentDto) {
    return this.studentService.createStudent(data);
  }

  @Get()
  findAllStudent() {
    return this.studentService.findAllStudent();
  }

  @Get(':id')
  findOneStudent(@Param('id') id: string) {
    return this.studentService.findOneStudent(id);
  }

  @Patch(':id')
  updateStudent(
    @Param('id') id: string,
    @Body() data: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(id, data);
  }

  @Delete(':id')
  deleteStudent(@Param('id') id: string) {
    return this.studentService.deleteStudent(id);
  }
}


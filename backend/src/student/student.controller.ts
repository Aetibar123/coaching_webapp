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
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  updateStudent(@Param('id') id: string, @Body() data: UpdateStudentDto) {
    return this.studentService.updateStudent(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deleteStudent(@Param('id') id: string) {
    return this.studentService.deleteStudent(id);
  }
}

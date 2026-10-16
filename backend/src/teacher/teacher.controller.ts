import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignBatchDto } from './dto/assign-batch.dto';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  /**
   * Create a new teacher (Admin only)
   * POST /teacher
   */
  @Post()
  @Roles(Role.ADMIN)
  createTeacher(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teacherService.createTeacher(createTeacherDto);
  }

  /**
   * List all teachers with their assigned cohorts
   * GET /teacher
   */
  @Get()
  findAllTeachers() {
    return this.teacherService.findAllTeachers();
  }

  /**
   * Get batches assigned to currently logged-in teacher
   * GET /teacher/me/batches
   */
  @Get('me/batches')
  async getMyBatches(@Headers('x-user-email') emailHeader?: string) {
    if (!emailHeader) {
      return {
        success: true,
        count: 0,
        data: [],
      };
    }
    const teacher = await this.teacherService.findByEmail(emailHeader);
    if (!teacher) {
      return {
        success: true,
        count: 0,
        data: [],
      };
    }
    const fullTeacher = await this.teacherService.findOneTeacher(teacher.id);
    return {
      success: true,
      teacher: fullTeacher.data,
      count: fullTeacher.data.batches?.length ?? 0,
      data: fullTeacher.data.batches ?? [],
    };
  }

  /**
   * Get a specific teacher by ID
   * GET /teacher/:id
   */
  @Get(':id')
  findOneTeacher(@Param('id') id: string) {
    return this.teacherService.findOneTeacher(id);
  }

  /**
   * Update teacher details (Admin only)
   * PATCH /teacher/:id
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  updateTeacher(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ) {
    return this.teacherService.updateTeacher(id, updateTeacherDto);
  }

  /**
   * Delete a teacher (Admin only)
   * DELETE /teacher/:id
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  deleteTeacher(@Param('id') id: string) {
    return this.teacherService.deleteTeacher(id);
  }

  /**
   * Assign batches to a teacher (Admin only)
   * POST /teacher/:id/batches
   */
  @Post(':id/batches')
  @Roles(Role.ADMIN)
  assignBatches(
    @Param('id') id: string,
    @Body() assignBatchDto: AssignBatchDto,
  ) {
    return this.teacherService.assignBatches(id, assignBatchDto.batch_ids);
  }

  /**
   * Remove a specific batch from a teacher (Admin only)
   * DELETE /teacher/:id/batches/:batchId
   */
  @Delete(':id/batches/:batchId')
  @Roles(Role.ADMIN)
  removeBatch(@Param('id') id: string, @Param('batchId') batchId: string) {
    return this.teacherService.removeBatch(id, batchId);
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  QueryAssignmentDto,
} from './assignment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  /**
   * Create an assignment with MCQ questions (Admin and Teachers only)
   */
  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createDto: CreateAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    const userEmail =
      req.user?.email ||
      (req.headers['x-user-email'] as string) ||
      undefined;

    const assignment = await this.assignmentService.createAssignment(
      createDto,
      userEmail,
    );
    return {
      success: true,
      data: assignment,
      message: 'Assignment created successfully',
    };
  }

  /**
   * Get all assignments with filters
   */
  @Get()
  async findAllAssignments(
    @Query() query: QueryAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    const userRole =
      req.user?.role ||
      (req.headers['x-user-role'] as string)?.toLowerCase();
    const userEmail =
      req.user?.email ||
      (req.headers['x-user-email'] as string)?.toLowerCase();

    const assignments = await this.assignmentService.findAllAssignments(
      query,
      userRole,
      userEmail,
    );

    return {
      success: true,
      data: assignments,
      count: assignments.length,
    };
  }

  /**
   * Get assignment by ID (hides correct options if student)
   */
  @Get(':id')
  async findAssignmentById(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const userRole =
      req.user?.role ||
      (req.headers['x-user-role'] as string)?.toLowerCase();
    const isTeacherOrAdmin =
      userRole === Role.ADMIN || userRole === Role.TEACHER;

    const assignment = await this.assignmentService.findAssignmentById(
      id,
      isTeacherOrAdmin,
    );

    return {
      success: true,
      data: assignment,
    };
  }

  /**
   * Student submits their answers
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submitAssignment(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    submitDto: SubmitAssignmentDto,
  ) {
    const result = await this.assignmentService.submitAssignment(
      id,
      submitDto,
    );

    return {
      success: true,
      data: result,
      message: `Assignment submitted. Your score: ${result.score}/${result.total_points} (${result.percentage}%)`,
    };
  }

  /**
   * Teacher/Admin view all submissions of an assignment
   */
  @Get(':id/submissions')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getAssignmentSubmissions(@Param('id') id: string) {
    const data = await this.assignmentService.getAssignmentSubmissions(id);
    return {
      success: true,
      data,
    };
  }

  /**
   * Delete assignment (Admin and Teachers only)
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async deleteAssignment(@Param('id') id: string) {
    return this.assignmentService.deleteAssignment(id);
  }
}


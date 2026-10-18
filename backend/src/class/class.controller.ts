import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ClassService } from './class.service';
import {
  CreateClassDto,
  UpdateClassDto,
  RescheduleClassDto,
  QueryClassDto,
} from './class.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * Schedule a new class
   * POST /classes
   */
  @Post()
  createClass(
    @Body() createClassDto: CreateClassDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.createClass(createClassDto, {
      role: roleHeader,
      email: emailHeader,
    });
  }

  /**
   * Get upcoming classes for dashboard widget
   * GET /classes/upcoming?limit=5
   */
  @Get('upcoming')
  getUpcomingClasses(
    @Query('limit') limit?: string,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.getUpcomingClasses(
      {
        role: roleHeader,
        email: emailHeader,
      },
      limit ? parseInt(limit, 10) : 5,
    );
  }

  /**
   * List scheduled classes with filters
   * GET /classes?batch_id=...&start_date=...&end_date=...&status=...
   */
  @Get()
  findAllClasses(
    @Query() query: QueryClassDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.findAllClasses(query, {
      role: roleHeader,
      email: emailHeader || query.teacher_email,
    });
  }

  /**
   * Get a single class by ID
   * GET /classes/:id
   */
  @Get(':id')
  findClassById(@Param('id') id: string) {
    return this.classService.findClassById(id);
  }

  /**
   * Reschedule a class (date, time, reason)
   * PATCH /classes/:id/reschedule
   */
  @Patch(':id/reschedule')
  rescheduleClass(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleClassDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.rescheduleClass(id, rescheduleDto, {
      role: roleHeader,
      email: emailHeader,
    });
  }

  /**
   * Update general class details
   * PATCH /classes/:id
   */
  @Patch(':id')
  updateClass(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.updateClass(id, updateClassDto, {
      role: roleHeader,
      email: emailHeader,
    });
  }

  /**
   * Cancel / delete a class
   * DELETE /classes/:id
   */
  @Delete(':id')
  deleteClass(
    @Param('id') id: string,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.classService.deleteClass(id, {
      role: roleHeader,
      email: emailHeader,
    });
  }
}


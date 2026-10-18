import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AttendanceService } from './attendance.service';
import {
  SubmitAttendanceDto,
  QueryAttendanceDto,
  AttendanceAnalyticsQueryDto,
} from './attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Submit attendance for students in a batch
   * POST /attendance
   */
  @Post()
  submitAttendance(@Body() submitAttendanceDto: SubmitAttendanceDto) {
    return this.attendanceService.submitAttendance(submitAttendanceDto);
  }

  /**
   * Convenient alias endpoint for attendance submission
   * POST /attendance/submit
   */
  @Post('submit')
  submitAttendanceAlias(@Body() submitAttendanceDto: SubmitAttendanceDto) {
    return this.attendanceService.submitAttendance(submitAttendanceDto);
  }

  /**
   * Get aggregate attendance analytics and trends (daily and monthly percentages, batch breakdown)
   * GET /attendance/analytics/summary?batch_id=...&start_date=...&end_date=...
   */
  @Get('analytics/summary')
  getAttendanceAnalytics(
    @Query() query: AttendanceAnalyticsQueryDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.attendanceService.getAttendanceAnalytics(query, {
      role: roleHeader || query.role,
      email: emailHeader || query.teacher_email || query.email,
    });
  }

  /**
   * Get student-wise attendance reports with rates and status badges
   * GET /attendance/analytics/student-report?batch_id=...&start_date=...&end_date=...&search=...
   */
  @Get('analytics/student-report')
  getStudentAttendanceReport(
    @Query() query: AttendanceAnalyticsQueryDto,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    return this.attendanceService.getStudentAttendanceReport(query, {
      role: roleHeader || query.role,
      email: emailHeader || query.teacher_email || query.email,
    });
  }

  /**
   * Export attendance data as CSV
   * GET /attendance/analytics/export?type=students|daily|batches&batch_id=...&start_date=...&end_date=...
   */
  @Get('analytics/export')
  async exportAttendanceCsv(
    @Query() query: AttendanceAnalyticsQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    const { filename, csv } = await this.attendanceService.exportAttendanceCsv(
      query,
      {
        role: roleHeader || query.role,
        email: emailHeader || query.teacher_email || query.email,
      },
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return csv;
  }

  /**
   * Retrieve attendance records with optional filters (batch_id, date, student_id)
   * GET /attendance?batch_id=...&date=...&student_id=...
   */
  @Get()
  findAllAttendance(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.findAllAttendance(query);
  }

  /**
   * Retrieve attendance records for a specific batch
   * GET /attendance/batch/:batchId?date=...
   */
  @Get('batch/:batchId')
  getBatchAttendance(
    @Param('batchId') batchId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getBatchAttendance(batchId, date);
  }
}

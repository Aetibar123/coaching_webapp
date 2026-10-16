import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { SubmitAttendanceDto, QueryAttendanceDto } from './attendance.dto';

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

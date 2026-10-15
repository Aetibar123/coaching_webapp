import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/CreateBatch.dto';
import { UpdateBatchDto } from './dto/UpdateBatch.dto';
import { AssignStudentDto, BatchQueryDto } from './dto/AssignStudent.dto';

@Controller('batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  /**
   * Create a new batch
   * POST /batch
   */
  @Post()
  createBatch(@Body() createBatchDto: CreateBatchDto) {
    return this.batchService.createBatch(createBatchDto);
  }

  /**
   * List all batches with optional course, status, or search filters
   * GET /batch?course=...&status=...&search=...
   */
  @Get()
  findAllBatches(@Query() query: BatchQueryDto) {
    return this.batchService.findAllBatches(query);
  }

  /**
   * Get single batch by ID
   * GET /batch/:id
   */
  @Get(':id')
  findBatchById(@Param('id') id: string) {
    return this.batchService.findBatchById(id);
  }

  /**
   * Update an existing batch
   * PATCH /batch/:id
   */
  @Patch(':id')
  updateBatch(
    @Param('id') id: string,
    @Body() updateBatchDto: UpdateBatchDto,
  ) {
    return this.batchService.updateBatch(id, updateBatchDto);
  }

  /**
   * Delete a batch
   * DELETE /batch/:id
   */
  @Delete(':id')
  deleteBatch(@Param('id') id: string) {
    return this.batchService.deleteBatch(id);
  }

  /**
   * Get all students enrolled in a specific batch
   * GET /batch/:id/students
   */
  @Get(':id/students')
  getBatchStudents(@Param('id') id: string) {
    return this.batchService.getBatchStudents(id);
  }

  /**
   * Get batch enrollment statistics (occupancy, vacancy, total)
   * GET /batch/:id/stats
   */
  @Get(':id/stats')
  getBatchStats(@Param('id') id: string) {
    return this.batchService.getBatchStats(id);
  }

  /**
   * Enroll a student into a batch via body
   * POST /batch/:id/students
   */
  @Post(':id/students')
  assignStudent(
    @Param('id') id: string,
    @Body() assignDto: AssignStudentDto,
  ) {
    return this.batchService.addStudentToBatch(id, assignDto.student_id);
  }

  /**
   * Enroll a student into a batch via URL param
   * POST /batch/:id/students/:studentId
   */
  @Post(':id/students/:studentId')
  addStudentToBatch(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.batchService.addStudentToBatch(id, studentId);
  }

  /**
   * Remove an enrolled student from a batch
   * DELETE /batch/:id/students/:studentId
   */
  @Delete(':id/students/:studentId')
  removeStudentFromBatch(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.batchService.removeStudentFromBatch(id, studentId);
  }
}

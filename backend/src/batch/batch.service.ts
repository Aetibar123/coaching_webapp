import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBatchDto } from './dto/CreateBatch.dto';
import { UpdateBatchDto } from './dto/UpdateBatch.dto';
import { BatchQueryDto } from './dto/AssignStudent.dto';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create a new batch
   */
  async createBatch(createBatchDto: CreateBatchDto) {
    const supabase = this.supabaseService.getClient();

    try {
      const payload = {
        ...createBatchDto,
        status: createBatchDto.status ?? 'active',
      };

      const { data, error } = await supabase
        .from('batch')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Batch created successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Batch Creation Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while creating the batch',
      );
    }
  }

  /**
   * Retrieve all batches with optional course, status, or search filters
   */
  async findAllBatches(
    query?: BatchQueryDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      let request = supabase.from('batch').select('*');

      if (query?.course) {
        request = request.eq('course', query.course);
      }
      if (query?.status) {
        request = request.eq('status', query.status);
      }
      if (query?.search) {
        request = request.ilike('name', `%${query.search}%`);
      }
      if (query?.teacher_id) {
        request = request.eq('teacher_id', query.teacher_id);
      }

      // Check teacher role filtering
      const isTeacherRole = userContext?.role?.toLowerCase() === 'teacher';
      const effectiveTeacherEmail =
        query?.teacher_email || (isTeacherRole ? userContext?.email : undefined);

      if (effectiveTeacherEmail) {
        // Resolve teacher by email
        const teacherRes = (await supabase
          .from('teachers')
          .select('id, name')
          .eq('email', effectiveTeacherEmail.toLowerCase().trim())
          .maybeSingle()) as {
          data: { id: string; name: string } | null;
          error: { message: string } | null;
        };

        const teacherData = teacherRes.data;

        if (teacherData) {
          // Filter by teacher_id or instructor name
          request = request.or(
            `teacher_id.eq.${teacherData.id},instructor.ilike.${teacherData.name}`,
          );
        } else if (isTeacherRole) {
          // If logged in as teacher but not assigned to any teacher profile yet, return 0 batches
          return {
            success: true,
            message: 'No batches assigned to this teacher',
            count: 0,
            data: [],
          };
        }
      }

      const { data, error } = await request;

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'All batches retrieved successfully',
        count: data?.length ?? 0,
        data: data ?? [],
      };
    } catch (error) {
      this.logger.error('Batch Find All Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving batches',
      );
    }
  }

  /**
   * Retrieve a single batch by ID
   */
  async findBatchById(id: string | number) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('batch')
        .select()
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundException(`Batch with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Batch found successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Batch Find By ID Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving the batch',
      );
    }
  }

  /**
   * Update an existing batch
   */
  async updateBatch(id: string | number, updateBatchDto: UpdateBatchDto) {
    const supabase = this.supabaseService.getClient();

    if (!updateBatchDto || Object.keys(updateBatchDto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided to update',
      );
    }

    try {
      const { data, error } = await supabase
        .from('batch')
        .update(updateBatchDto)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new BadRequestException(
          `Supabase Update Error: ${error.message}`,
        );
      }

      if (!data) {
        throw new NotFoundException(`Batch with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Batch updated successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Batch Update Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while updating the batch',
      );
    }
  }

  /**
   * Delete a batch
   */
  async deleteBatch(id: string | number) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('batch')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new BadRequestException(
          `Supabase Delete Error: ${error.message}`,
        );
      }

      if (!data) {
        throw new NotFoundException(`Batch with ID ${id} not found to delete`);
      }

      return {
        success: true,
        message: 'Batch deleted successfully',
        deletedData: data,
      };
    } catch (error) {
      this.logger.error('Batch Delete Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while deleting the batch',
      );
    }
  }

  /**
   * Retrieve all students enrolled in a specific batch
   */
  async getBatchStudents(batchId: string | number) {
    const supabase = this.supabaseService.getClient();

    // Verify batch exists
    await this.findBatchById(batchId);

    try {
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('batch_id', batchId);

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Batch students retrieved successfully',
        batchId,
        count: data?.length ?? 0,
        data,
      };
    } catch (error) {
      this.logger.error('Get Batch Students Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving batch students',
      );
    }
  }

  /**
   * Assign a student to a batch (with capacity check)
   */
  async addStudentToBatch(
    batchId: string | number,
    studentId: string | number,
  ) {
    const supabase = this.supabaseService.getClient();

    // 1. Verify batch exists
    const batchRes = await this.findBatchById(batchId);
    const batch = batchRes.data;

    // 2. Check batch capacity if specified
    if (batch.capacity) {
      const { count, error: countError } = await supabase
        .from('student')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId);

      if (countError) {
        throw new BadRequestException(`Supabase Error: ${countError.message}`);
      }

      if (count !== null && count >= batch.capacity) {
        throw new BadRequestException(
          `Batch has reached its maximum capacity of ${batch.capacity} students`,
        );
      }
    }

    // 3. Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('student')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      throw new BadRequestException(`Supabase Error: ${studentError.message}`);
    }

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // 4. Update student's batch_id
    try {
      const { data: updatedStudent, error: updateError } = await supabase
        .from('student')
        .update({ batch_id: batchId })
        .eq('id', studentId)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new BadRequestException(`Supabase Error: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Student assigned to batch successfully',
        data: {
          student: updatedStudent,
          batch: {
            id: batch.id,
            name: batch.name,
            course: batch.course,
          },
        },
      };
    } catch (error) {
      this.logger.error('Add Student To Batch Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while assigning student to batch',
      );
    }
  }

  /**
   * Remove a student from a batch
   */
  async removeStudentFromBatch(
    batchId: string | number,
    studentId: string | number,
  ) {
    const supabase = this.supabaseService.getClient();

    // 1. Verify batch exists
    await this.findBatchById(batchId);

    // 2. Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('student')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      throw new BadRequestException(`Supabase Error: ${studentError.message}`);
    }

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // 3. Check if student is actually in this batch
    if (student.batch_id != batchId) {
      throw new BadRequestException(
        `Student ${studentId} is not enrolled in batch ${batchId}`,
      );
    }

    // 4. Remove student from batch (set batch_id to null)
    try {
      const { data: updatedStudent, error: updateError } = await supabase
        .from('student')
        .update({ batch_id: null })
        .eq('id', studentId)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new BadRequestException(`Supabase Error: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Student removed from batch successfully',
        data: updatedStudent,
      };
    } catch (error) {
      this.logger.error('Remove Student From Batch Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while removing student from batch',
      );
    }
  }

  /**
   * Get statistics for a batch (capacity, enrollment, vacancy)
   */
  async getBatchStats(batchId: string | number) {
    const supabase = this.supabaseService.getClient();

    // Verify batch exists
    const batchRes = await this.findBatchById(batchId);
    const batch = batchRes.data;

    try {
      const { count, error } = await supabase
        .from('student')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId);

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      const enrolled = count ?? 0;
      const capacity = batch.capacity ?? null;
      const availableSeats =
        capacity !== null ? Math.max(0, capacity - enrolled) : null;
      const occupancyRate =
        capacity !== null && capacity > 0
          ? `${Math.min(100, Math.round((enrolled / capacity) * 100))}%`
          : null;

      return {
        success: true,
        message: 'Batch statistics retrieved successfully',
        data: {
          batchId: batch.id,
          name: batch.name,
          course: batch.course,
          status: batch.status,
          enrolledStudents: enrolled,
          capacity,
          availableSeats,
          occupancyRate,
          isFull: capacity !== null ? enrolled >= capacity : false,
        },
      };
    } catch (error) {
      this.logger.error('Get Batch Stats Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while calculating batch statistics',
      );
    }
  }
}

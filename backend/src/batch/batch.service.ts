import {
  BadRequestException,
  ForbiddenException,
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
   * Helper to check if user is a teacher and resolve teacher email
   */
  private async isUserTeacher(
    userContext?: { role?: string; email?: string },
    explicitTeacherEmail?: string,
  ): Promise<{ isTeacher: boolean; teacherEmail?: string }> {
    const supabase = this.supabaseService.getClient();
    const effectiveEmail = (
      explicitTeacherEmail || userContext?.email
    )?.toLowerCase()?.trim();
    const headerRole = userContext?.role?.toLowerCase()?.trim();

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // 1. Check if user is Admin
    if (headerRole === 'admin' || (effectiveEmail && adminEmails.includes(effectiveEmail))) {
      return { isTeacher: false, teacherEmail: effectiveEmail };
    }

    // 2. Explicit teacher role
    if (headerRole === 'teacher' || explicitTeacherEmail) {
      return { isTeacher: true, teacherEmail: effectiveEmail };
    }

    // 3. Fallback: If role not sent, check teachers and profiles tables by email
    if (effectiveEmail) {
      try {
        const tCheck = await supabase
          .from('teachers')
          .select('id')
          .eq('email', effectiveEmail)
          .maybeSingle();

        if (tCheck.data) {
          return { isTeacher: true, teacherEmail: effectiveEmail };
        }

        const pCheck = await supabase
          .from('profiles')
          .select('role')
          .eq('email', effectiveEmail)
          .maybeSingle();

        if (pCheck.data?.role?.toLowerCase() === 'teacher') {
          return { isTeacher: true, teacherEmail: effectiveEmail };
        }
      } catch {
        // Fallback on error
      }
    }

    return { isTeacher: false, teacherEmail: effectiveEmail };
  }

  /**
   * Helper to retrieve batch IDs assigned to a specific teacher
   */
  private async getTeacherAssignedBatchIds(
    email?: string,
  ): Promise<(string | number)[]> {
    if (!email) return [];
    const supabase = this.supabaseService.getClient();

    try {
      const teacherRes = (await supabase
        .from('teachers')
        .select('id, name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()) as {
        data: { id: string; name: string } | null;
        error: { message: string } | null;
      };

      const batchIdSet = new Set<string | number>();

      if (teacherRes.data) {
        const teacher = teacherRes.data;

        // 1. Check batches assigned by teacher_id
        try {
          const byIdRes = (await supabase
            .from('batch')
            .select('id')
            .eq('teacher_id', teacher.id)) as {
            data: { id: string | number }[] | null;
          };
          (byIdRes.data ?? []).forEach((b) => batchIdSet.add(b.id));
        } catch {
          // Column teacher_id might not exist or error
        }

        // 2. Check batches assigned by instructor name
        if (teacher.name) {
          try {
            const byNameRes = (await supabase
              .from('batch')
              .select('id')
              .ilike('instructor', `%${teacher.name}%`)) as {
              data: { id: string | number }[] | null;
            };
            (byNameRes.data ?? []).forEach((b) => batchIdSet.add(b.id));
          } catch {
            // Ignore
          }
        }
      }

      // 3. Check batches assigned by instructor email
      try {
        const byEmailRes = (await supabase
          .from('batch')
          .select('id')
          .ilike('instructor', `%${email}%`)) as {
          data: { id: string | number }[] | null;
        };
        (byEmailRes.data ?? []).forEach((b) => batchIdSet.add(b.id));
      } catch {
        // Ignore
      }

      return Array.from(batchIdSet);
    } catch (err) {
      this.logger.error(`Error resolving assigned batches for teacher ${email}:`, err);
      return [];
    }
  }

  /**
   * Create a new batch
   */
  async createBatch(createBatchDto: CreateBatchDto) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('batch')
        .insert({
          name: createBatchDto.name,
          course: createBatchDto.course,
          description: createBatchDto.description ?? null,
          instructor: createBatchDto.instructor ?? null,
          teacher_id: createBatchDto.teacher_id ?? null,
          capacity: createBatchDto.capacity ?? 30,
          fee: createBatchDto.fee ?? 0,
          start_date: createBatchDto.start_date ?? null,
          end_date: createBatchDto.end_date ?? null,
          status: createBatchDto.status ?? 'active',
        })
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
   * Retrieve all batches with optional course, status, or search filters.
   * Teachers are strictly restricted to their own assigned batches only.
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

      // Check if user is a teacher
      const { isTeacher, teacherEmail } = await this.isUserTeacher(
        userContext,
        query?.teacher_email,
      );

      if (isTeacher) {
        if (!teacherEmail) {
          return {
            success: true,
            message: 'No batches assigned to this teacher',
            count: 0,
            data: [],
          };
        }

        const assignedBatchIds = await this.getTeacherAssignedBatchIds(teacherEmail);

        if (assignedBatchIds.length === 0) {
          return {
            success: true,
            message: 'No batches assigned to this teacher',
            count: 0,
            data: [],
          };
        }

        // Strictly constrain query to only the teacher's assigned batches
        request = request.in('id', assignedBatchIds);
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
   * Retrieve a single batch by ID (scoped for teachers)
   */
  async findBatchById(
    id: string | number,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // If user is a teacher, verify they are assigned to this batch
      const { isTeacher, teacherEmail } = await this.isUserTeacher(userContext);
      if (isTeacher && teacherEmail) {
        const assignedBatchIds = await this.getTeacherAssignedBatchIds(teacherEmail);
        const hasAccess = assignedBatchIds.some((bId) => String(bId) === String(id));
        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have permission to access batches not assigned to you',
          );
        }
      }

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
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving the batch',
      );
    }
  }

  /**
   * Update an existing batch (Admin only)
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
   * Delete a batch (Admin only)
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
   * Retrieve all students enrolled in a specific batch (Teacher scoped)
   */
  async getBatchStudents(
    batchId: string | number,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    // Verify batch exists and user has authorization
    await this.findBatchById(batchId, userContext);

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
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
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
            capacity: batch.capacity,
          },
        },
      };
    } catch (error) {
      this.logger.error('Assign Student To Batch Error:', error);
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
   * Get statistics for a batch (capacity, enrollment, vacancy, scoped for teachers)
   */
  async getBatchStats(
    batchId: string | number,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    // Verify batch exists and user has authorization
    const batchRes = await this.findBatchById(batchId, userContext);
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
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while calculating batch statistics',
      );
    }
  }
}

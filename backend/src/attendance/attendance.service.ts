import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SubmitAttendanceDto, QueryAttendanceDto } from './attendance.dto';

interface StudentRecord {
  id: string | number;
  name?: string;
  batch_id?: string | number | null;
}

interface BatchRecord {
  id: string | number;
  name?: string;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Submit attendance for a batch of students on a specific date.
   *
   * Validates that:
   * 1. No duplicate student IDs are present in the submission.
   * 2. The specified batch exists.
   * 3. All students exist and belong to the specified batch.
   * 4. Transforms the student items using .map() and bulk inserts into Supabase.
   */
  async submitAttendance(dto: SubmitAttendanceDto) {
    const batchId = dto.batch_id ?? dto.batchId;
    const studentsList = dto.students ?? dto.records;

    if (!batchId) {
      throw new BadRequestException('batch_id is required');
    }

    if (!studentsList || studentsList.length === 0) {
      throw new BadRequestException(
        'At least one student attendance record must be provided',
      );
    }

    // 1. Extract and validate student IDs
    const studentIds: (string | number)[] = studentsList.map((s) => {
      const id = s.student_id ?? s.studentId;
      if (id === undefined || id === null) {
        throw new BadRequestException(
          'student_id is required for all attendance entries',
        );
      }
      return id;
    });

    // Check for duplicate student IDs in the submitted array
    const seenIds = new Set<string>();
    const duplicateIds: (string | number)[] = [];

    for (const id of studentIds) {
      const idKey = String(id);
      if (seenIds.has(idKey)) {
        if (!duplicateIds.includes(id)) {
          duplicateIds.push(id);
        }
      } else {
        seenIds.add(idKey);
      }
    }

    if (duplicateIds.length > 0) {
      throw new BadRequestException(
        `Duplicate student IDs detected in attendance submission: ${duplicateIds.join(', ')}`,
      );
    }

    const supabase = this.supabaseService.getClient();

    try {
      // 2. Verify that the batch exists
      const { data: batchData, error: batchError } = await supabase
        .from('batch')
        .select('id, name')
        .eq('id', batchId)
        .maybeSingle();

      if (batchError) {
        this.logger.error(`Error verifying batch ${batchId}:`, batchError);
        throw new BadRequestException(`Supabase Error: ${batchError.message}`);
      }

      const batch = batchData as BatchRecord | null;
      if (!batch) {
        throw new NotFoundException(`Batch with ID ${batchId} not found`);
      }

      // 3. Verify that all students exist and belong to the specified batch
      const { data: foundStudentsData, error: studentsError } = await supabase
        .from('student')
        .select('id, name, batch_id')
        .in('id', studentIds);

      if (studentsError) {
        this.logger.error(
          'Error querying students for verification:',
          studentsError,
        );
        throw new BadRequestException(
          `Supabase Error: ${studentsError.message}`,
        );
      }

      const foundStudents = (foundStudentsData as StudentRecord[] | null) ?? [];
      const studentMap = new Map<string, StudentRecord>();
      for (const s of foundStudents) {
        studentMap.set(String(s.id), s);
      }

      const notFoundIds: (string | number)[] = [];
      const wrongBatchStudents: {
        id: string | number;
        batch_id: string | number | null;
      }[] = [];

      for (const id of studentIds) {
        const student = studentMap.get(String(id));
        if (!student) {
          notFoundIds.push(id);
        } else if (String(student.batch_id) !== String(batchId)) {
          wrongBatchStudents.push({
            id,
            batch_id: student.batch_id ?? null,
          });
        }
      }

      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `Student(s) with ID(s) ${notFoundIds.join(', ')} not found in database`,
        );
      }

      if (wrongBatchStudents.length > 0) {
        const details = wrongBatchStudents
          .map(
            (s) =>
              `student ${s.id} (assigned to batch ${s.batch_id ?? 'none'})`,
          )
          .join(', ');
        throw new BadRequestException(
          `The following students do not belong to batch ${batchId}: ${details}`,
        );
      }

      // 4. Use .map() to transform student data into attendance records
      const attendanceRecords = studentsList.map((student) => ({
        student_id: student.student_id ?? student.studentId,
        batch_id: batchId,
        date: dto.date,
        status: student.status.trim().toLowerCase(),
      }));

      // 5. Bulk insert into Supabase attendance table
      const { data, error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords)
        .select();

      if (insertError) {
        this.logger.error('Attendance Bulk Insert Error:', insertError);

        // Unique constraint violation (e.g. attendance already recorded for this student on this date)
        if (insertError.code === '23505') {
          throw new BadRequestException(
            `Attendance for one or more students on date ${dto.date} has already been recorded`,
          );
        }

        throw new BadRequestException(`Supabase Error: ${insertError.message}`);
      }

      const inserted = data as Record<string, unknown>[] | null;

      return {
        success: true,
        message: 'Attendance submitted successfully',
        batchId,
        date: dto.date,
        count: inserted?.length ?? attendanceRecords.length,
        data: inserted,
      };
    } catch (error) {
      this.logger.error('Attendance Submission Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while submitting attendance',
      );
    }
  }

  /**
   * Retrieve attendance records with optional filtering by batch_id, date, or student_id
   */
  async findAllAttendance(query?: QueryAttendanceDto) {
    const supabase = this.supabaseService.getClient();

    try {
      let request = supabase.from('attendance').select('*');

      if (query?.batch_id) {
        request = request.eq('batch_id', query.batch_id);
      }
      if (query?.date) {
        request = request.eq('date', query.date);
      }
      if (query?.student_id) {
        request = request.eq('student_id', query.student_id);
      }

      const { data, error } = await request;

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      const records = data as Record<string, unknown>[] | null;

      return {
        success: true,
        message: 'Attendance records retrieved successfully',
        count: records?.length ?? 0,
        data: records,
      };
    } catch (error) {
      this.logger.error('Attendance Find All Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving attendance records',
      );
    }
  }

  /**
   * Retrieve all attendance records for a specific batch, with optional date filter
   */
  async getBatchAttendance(batchId: string | number, date?: string) {
    const supabase = this.supabaseService.getClient();

    try {
      let request = supabase
        .from('attendance')
        .select('*')
        .eq('batch_id', batchId);

      if (date) {
        request = request.eq('date', date);
      }

      const { data, error } = await request;

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      const records = data as Record<string, unknown>[] | null;

      return {
        success: true,
        message: 'Batch attendance retrieved successfully',
        batchId,
        date: date ?? null,
        count: records?.length ?? 0,
        data: records,
      };
    } catch (error) {
      this.logger.error('Batch Attendance Retrieval Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while retrieving batch attendance',
      );
    }
  }
}

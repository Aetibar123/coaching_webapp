import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateClassDto,
  UpdateClassDto,
  RescheduleClassDto,
  QueryClassDto,
} from './class.dto';

export interface ClassRecord {
  id: string;
  batch_id: string | number;
  batch_name?: string;
  course?: string;
  instructor?: string;
  title: string;
  description?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  meeting_link?: string | null;
  status: 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
  reschedule_reason?: string | null;
  original_date?: string | null;
  original_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class ClassService {
  private readonly logger = new Logger(ClassService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Helper to check if user is a teacher and resolve email
   */
  private async isUserTeacher(
    userContext?: { role?: string; email?: string },
    explicitTeacherEmail?: string,
  ): Promise<{ isTeacher: boolean; userEmail?: string }> {
    const supabase = this.supabaseService.getClient();
    const effectiveEmail = (
      explicitTeacherEmail || userContext?.email
    )?.toLowerCase()?.trim();
    const headerRole = userContext?.role?.toLowerCase()?.trim();

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (headerRole === 'admin' || (effectiveEmail && adminEmails.includes(effectiveEmail))) {
      return { isTeacher: false, userEmail: effectiveEmail };
    }

    if (headerRole === 'teacher' || explicitTeacherEmail) {
      return { isTeacher: true, userEmail: effectiveEmail };
    }

    if (effectiveEmail) {
      try {
        const tCheck = await supabase
          .from('teachers')
          .select('id')
          .eq('email', effectiveEmail)
          .maybeSingle();

        if (tCheck.data) {
          return { isTeacher: true, userEmail: effectiveEmail };
        }

        const pCheck = await supabase
          .from('profiles')
          .select('role')
          .eq('email', effectiveEmail)
          .maybeSingle();

        if (pCheck.data?.role?.toLowerCase() === 'teacher') {
          return { isTeacher: true, userEmail: effectiveEmail };
        }
      } catch {
        // Fallback
      }
    }

    return { isTeacher: false, userEmail: effectiveEmail };
  }

  /**
   * Helper to retrieve batches assigned to a teacher
   */
  private async getTeacherBatchIds(email?: string): Promise<(string | number)[]> {
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

      if (!teacherRes.data) return [];

      const teacher = teacherRes.data;
      const batchIdSet = new Set<string | number>();

      try {
        const byIdRes = (await supabase
          .from('batch')
          .select('id')
          .eq('teacher_id', teacher.id)) as {
          data: { id: string | number }[] | null;
        };
        (byIdRes.data ?? []).forEach((b) => batchIdSet.add(b.id));
      } catch {
        // Ignore column missing
      }

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

      return Array.from(batchIdSet);
    } catch {
      return [];
    }
  }

  /**
   * Helper to retrieve student's enrolled batch ID
   */
  private async getStudentBatchId(studentEmailOrId?: string): Promise<string | null> {
    if (!studentEmailOrId) return null;
    const supabase = this.supabaseService.getClient();

    try {
      const res = (await supabase
        .from('student')
        .select('batch_id')
        .or(`id.eq.${studentEmailOrId},email.ilike.${studentEmailOrId}`)
        .maybeSingle()) as {
        data: { batch_id: string } | null;
      };

      return res.data?.batch_id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new scheduled class
   */
  async createClass(
    dto: CreateClassDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Verify batch exists
      const batchRes = (await supabase
        .from('batch')
        .select('id, name, course, instructor, teacher_id')
        .eq('id', dto.batch_id)
        .maybeSingle()) as {
        data: {
          id: string | number;
          name: string;
          course: string;
          instructor?: string;
          teacher_id?: string;
        } | null;
        error: { message: string } | null;
      };

      if (!batchRes.data) {
        throw new NotFoundException(`Batch with ID ${dto.batch_id} not found`);
      }

      // 2. If teacher, verify authorization to schedule for this batch
      const { isTeacher, userEmail } = await this.isUserTeacher(userContext);
      if (isTeacher) {
        const allowedBatchIds = await this.getTeacherBatchIds(userEmail);
        const isAllowed = allowedBatchIds.some(
          (bId) => String(bId) === String(dto.batch_id),
        );
        if (!isAllowed) {
          throw new BadRequestException(
            'Teachers can only schedule classes for their assigned batches',
          );
        }
      }

      // 3. Insert class record
      const payload = {
        batch_id: dto.batch_id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        date: dto.date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        room: dto.room?.trim() || null,
        meeting_link: dto.meeting_link?.trim() || null,
        status: 'scheduled',
      };

      const { data, error } = await supabase
        .from('classes')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Class scheduled successfully',
        data: {
          ...(data as Record<string, unknown>),
          batch_name: batchRes.data.name,
          course: batchRes.data.course,
          instructor: batchRes.data.instructor,
        },
      };
    } catch (err) {
      this.logger.error('Create Class Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to schedule class');
    }
  }

  /**
   * Retrieve classes with optional filters (batch, dates, status, role scoping)
   */
  async findAllClasses(
    query?: QueryClassDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const { isTeacher, userEmail } = await this.isUserTeacher(
        userContext,
        query?.teacher_email,
      );
      const normalizedRole = userContext?.role?.toLowerCase();

      let allowedBatchIds: (string | number)[] | null = null;
      if (isTeacher) {
        allowedBatchIds = await this.getTeacherBatchIds(userEmail);
        if (allowedBatchIds.length === 0) {
          return { success: true, count: 0, data: [] };
        }
      }

      // Check if student is requesting
      if (normalizedRole === 'student' || query?.student_id) {
        const studentBatchId = await this.getStudentBatchId(
          query?.student_id || userEmail,
        );
        if (studentBatchId) {
          allowedBatchIds = [studentBatchId];
        }
      }

      // Query batches metadata for join details
      const batchesRes = (await supabase
        .from('batch')
        .select('id, name, course, instructor')) as {
        data: {
          id: string | number;
          name: string;
          course: string;
          instructor?: string;
        }[] | null;
      };
      const batchesMap = new Map<
        string,
        { name: string; course: string; instructor?: string }
      >();
      (batchesRes.data ?? []).forEach((b) => {
        batchesMap.set(String(b.id), b);
      });

      // Build classes query
      let req = supabase.from('classes').select('*');

      if (query?.batch_id) {
        if (isTeacher && allowedBatchIds !== null) {
          const isAllowed = allowedBatchIds.some(
            (bId) => String(bId) === String(query.batch_id),
          );
          if (!isAllowed) {
            return { success: true, count: 0, data: [] };
          }
        }
        req = req.eq('batch_id', query.batch_id);
      } else if (allowedBatchIds !== null) {
        req = req.in('batch_id', allowedBatchIds);
      }

      if (query?.start_date) {
        req = req.gte('date', query.start_date.split('T')[0]);
      }
      if (query?.end_date) {
        req = req.lte('date', query.end_date.split('T')[0]);
      }
      if (query?.status) {
        req = req.eq('status', query.status.toLowerCase());
      }
      if (query?.search) {
        req = req.ilike('title', `%${query.search}%`);
      }

      req = req.order('date', { ascending: true }).order('start_time', { ascending: true });

      const { data, error } = await req;
      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      const list = (data as Record<string, unknown>[]) ?? [];

      const enriched = list.map((item) => {
        const bMeta = batchesMap.get(String(item.batch_id));
        return {
          ...item,
          batch_name: bMeta?.name ?? `Batch #${item.batch_id}`,
          course: bMeta?.course ?? 'General',
          instructor: bMeta?.instructor ?? 'Instructor',
        };
      });

      return {
        success: true,
        count: enriched.length,
        data: enriched,
      };
    } catch (err) {
      this.logger.error('Find All Classes Error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to retrieve classes');
    }
  }

  /**
   * Retrieve upcoming classes for dashboard widget
   */
  async getUpcomingClasses(
    userContext?: { role?: string; email?: string },
    limit = 5,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const res = await this.findAllClasses(
      { start_date: today },
      userContext,
    );
    const classes = res.data ?? [];
    return {
      success: true,
      count: Math.min(classes.length, limit),
      data: classes.slice(0, limit),
    };
  }

  /**
   * Retrieve a single class by ID
   */
  async findClassById(id: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }
      if (!data) {
        throw new NotFoundException(`Class with ID ${id} not found`);
      }

      const bRes = (await supabase
        .from('batch')
        .select('name, course, instructor')
        .eq('id', (data as { batch_id: string }).batch_id)
        .maybeSingle()) as {
        data: { name: string; course: string; instructor?: string } | null;
      };

      return {
        success: true,
        data: {
          ...(data as Record<string, unknown>),
          batch_name: bRes.data?.name ?? 'Batch',
          course: bRes.data?.course ?? '',
          instructor: bRes.data?.instructor ?? '',
        },
      };
    } catch (err) {
      this.logger.error('Find Class By ID Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to retrieve class');
    }
  }

  /**
   * Reschedule an existing class (Admin or assigned Teacher)
   */
  async rescheduleClass(
    id: string,
    dto: RescheduleClassDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Verify class exists
      const current = await this.findClassById(id);
      const classItem = current.data as unknown as {
        id: string;
        batch_id: string;
        date: string;
        start_time: string;
        room?: string;
        meeting_link?: string;
      };

      // 2. Role authorization check
      const { isTeacher, userEmail } = await this.isUserTeacher(userContext);
      if (isTeacher) {
        const allowedBatchIds = await this.getTeacherBatchIds(userEmail);
        const isAllowed = allowedBatchIds.some(
          (bId) => String(bId) === String(classItem.batch_id),
        );
        if (!isAllowed) {
          throw new BadRequestException(
            'Teachers can only reschedule classes for their assigned batches',
          );
        }
      }

      // 3. Update class with new schedule and archive previous schedule
      const updatePayload: Record<string, unknown> = {
        date: dto.date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        status: 'rescheduled',
        reschedule_reason: dto.reason?.trim() || 'Schedule adjusted',
        original_date: classItem.date,
        original_time: classItem.start_time,
        updated_at: new Date().toISOString(),
      };

      if (dto.room !== undefined) updatePayload.room = dto.room?.trim() || null;
      if (dto.meeting_link !== undefined)
        updatePayload.meeting_link = dto.meeting_link?.trim() || null;

      const { data, error } = await supabase
        .from('classes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Class rescheduled successfully',
        data,
      };
    } catch (err) {
      this.logger.error('Reschedule Class Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to reschedule class');
    }
  }

  /**
   * Update general class details or status
   */
  async updateClass(
    id: string,
    dto: UpdateClassDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const current = await this.findClassById(id);
      const classItem = current.data as unknown as { id: string; batch_id: string };

      const isTeacher = userContext?.role?.toLowerCase() === 'teacher';
      if (isTeacher) {
        const allowedBatchIds = await this.getTeacherBatchIds(userContext?.email);
        const isAllowed = allowedBatchIds.some(
          (bId) => String(bId) === String(classItem.batch_id),
        );
        if (!isAllowed) {
          throw new BadRequestException(
            'Teachers can only update classes for their assigned batches',
          );
        }
      }

      const payload: Record<string, unknown> = {
        ...dto,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Class updated successfully',
        data,
      };
    } catch (err) {
      this.logger.error('Update Class Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to update class');
    }
  }

  /**
   * Delete / Cancel a class
   */
  async deleteClass(
    id: string,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const current = await this.findClassById(id);
      const classItem = current.data as unknown as { id: string; batch_id: string };

      const isTeacher = userContext?.role?.toLowerCase() === 'teacher';
      if (isTeacher) {
        const allowedBatchIds = await this.getTeacherBatchIds(userContext?.email);
        const isAllowed = allowedBatchIds.some(
          (bId) => String(bId) === String(classItem.batch_id),
        );
        if (!isAllowed) {
          throw new BadRequestException(
            'Teachers can only cancel classes for their assigned batches',
          );
        }
      }

      const { data, error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Class removed successfully',
        data,
      };
    } catch (err) {
      this.logger.error('Delete Class Error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to delete class');
    }
  }
}

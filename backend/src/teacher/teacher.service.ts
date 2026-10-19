import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

export interface BatchSummary {
  id: string | number;
  name: string;
  course: string;
  status?: string;
  instructor?: string;
  capacity?: number;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  bio?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  batches?: BatchSummary[];
}

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create a new teacher (Admin only)
   */
  async createTeacher(dto: CreateTeacherDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Check if teacher with email already exists
      const checkRes = (await supabase
        .from('teachers')
        .select('id, email')
        .eq('email', dto.email.toLowerCase().trim())
        .maybeSingle()) as {
        data: { id: string; email: string } | null;
        error: { message: string } | null;
      };

      if (checkRes.data) {
        throw new BadRequestException(
          `Teacher with email ${dto.email} already exists`,
        );
      }

      // 2. Insert new teacher
      const insertRes = (await supabase
        .from('teachers')
        .insert({
          name: dto.name.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() || null,
          subject: dto.subject?.trim() || null,
          bio: dto.bio?.trim() || null,
        })
        .select()
        .single()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      if (insertRes.error || !insertRes.data) {
        this.logger.error(
          `Error creating teacher: ${insertRes.error?.message}`,
        );
        throw new BadRequestException(
          `Supabase Error: ${insertRes.error?.message ?? 'Failed to create teacher'}`,
        );
      }

      return {
        success: true,
        message: 'Teacher created successfully',
        data: insertRes.data,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Failed to create teacher:', err);
      throw new InternalServerErrorException('Failed to create teacher');
    }
  }

  /**
   * List all teachers with their assigned batches
   */
  async findAllTeachers() {
    const supabase = this.supabaseService.getClient();

    try {
      const listRes = (await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false })) as {
        data: TeacherRecord[] | null;
        error: { message: string } | null;
      };

      if (listRes.error) {
        this.logger.error(`Error querying teachers: ${listRes.error.message}`);
        throw new BadRequestException(
          `Supabase Error: ${listRes.error.message}`,
        );
      }

      const teachers = listRes.data ? [...listRes.data] : [];
      const existingEmails = new Set(
        teachers.map((t) => t.email.toLowerCase().trim()),
      );

      // Auto-sync users who logged in as teachers from profiles table into teachers directory
      try {
        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        const profilesRes = (await supabase
          .from('profiles')
          .select('id, email, full_name')
          .ilike('role', 'teacher')) as {
          data: { id: string; email: string; full_name?: string }[] | null;
        };

        const profilesToSync = (profilesRes.data ?? []).filter(
          (p) =>
            p.email &&
            !existingEmails.has(p.email.toLowerCase().trim()) &&
            !adminEmails.includes(p.email.toLowerCase().trim()),
        );

        for (const p of profilesToSync) {
          const teacherEmail = p.email.toLowerCase().trim();
          const teacherName = (p.full_name || p.email.split('@')[0]).trim();

          try {
            const insRes = (await supabase
              .from('teachers')
              .insert({
                name: teacherName,
                email: teacherEmail,
                subject: 'Faculty',
              })
              .select()
              .maybeSingle()) as { data: TeacherRecord | null };

            if (insRes.data) {
              teachers.push(insRes.data);
              existingEmails.add(teacherEmail);
            } else {
              teachers.push({
                id: p.id,
                name: teacherName,
                email: teacherEmail,
                subject: 'Faculty',
                created_at: new Date().toISOString(),
              });
              existingEmails.add(teacherEmail);
            }
          } catch {
            teachers.push({
              id: p.id,
              name: teacherName,
              email: teacherEmail,
              subject: 'Faculty',
              created_at: new Date().toISOString(),
            });
            existingEmails.add(teacherEmail);
          }
        }
      } catch (syncErr) {
        this.logger.warn('Error auto-syncing teacher accounts:', syncErr);
      }

      // Query batches to map assigned batches to each teacher
      const batchesRes = (await supabase
        .from('batch')
        .select(
          'id, name, course, status, instructor, capacity, teacher_id',
        )) as {
        data: (BatchSummary & { teacher_id?: string | null })[] | null;
        error: { message: string } | null;
      };

      const allBatches = batchesRes.data ?? [];

      const teachersWithBatches = teachers.map((t) => {
        const assigned = allBatches.filter(
          (b) =>
            b.teacher_id === t.id ||
            (b.instructor &&
              b.instructor.toLowerCase().trim() ===
                t.name.toLowerCase().trim()),
        );
        return {
          ...t,
          batches: assigned,
        };
      });

      return {
        success: true,
        count: teachersWithBatches.length,
        data: teachersWithBatches,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Failed to list teachers:', err);
      throw new InternalServerErrorException('Failed to list teachers');
    }
  }

  /**
   * Get single teacher by ID
   */
  async findOneTeacher(id: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const findRes = (await supabase
        .from('teachers')
        .select('*')
        .eq('id', id)
        .maybeSingle()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      if (findRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${findRes.error.message}`,
        );
      }

      if (!findRes.data) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      // Fetch assigned batches
      const batchesRes = (await supabase
        .from('batch')
        .select(
          'id, name, course, status, instructor, capacity, teacher_id',
        )) as {
        data: (BatchSummary & { teacher_id?: string | null })[] | null;
        error: { message: string } | null;
      };

      const allBatches = batchesRes.data ?? [];
      const assigned = allBatches.filter(
        (b) =>
          b.teacher_id === findRes.data?.id ||
          (b.instructor &&
            b.instructor.toLowerCase().trim() ===
              findRes.data?.name.toLowerCase().trim()),
      );

      return {
        success: true,
        data: {
          ...findRes.data,
          batches: assigned,
        },
      };
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Failed to find teacher ${id}:`, err);
      throw new InternalServerErrorException('Failed to retrieve teacher');
    }
  }

  /**
   * Update teacher details (Admin only)
   */
  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const supabase = this.supabaseService.getClient();

    try {
      const updateData: Record<string, unknown> = {};
      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.email !== undefined)
        updateData.email = dto.email.toLowerCase().trim();
      if (dto.phone !== undefined) updateData.phone = dto.phone.trim();
      if (dto.subject !== undefined) updateData.subject = dto.subject.trim();
      if (dto.bio !== undefined) updateData.bio = dto.bio.trim();
      updateData.updated_at = new Date().toISOString();

      const updateRes = (await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      if (updateRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${updateRes.error.message}`,
        );
      }

      if (!updateRes.data) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      // If teacher name updated, update instructor in assigned batches
      if (dto.name) {
        await supabase
          .from('batch')
          .update({ instructor: dto.name.trim() })
          .eq('teacher_id', id);
      }

      return {
        success: true,
        message: 'Teacher profile updated successfully',
        data: updateRes.data,
      };
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Failed to update teacher ${id}:`, err);
      throw new InternalServerErrorException('Failed to update teacher');
    }
  }

  /**
   * Delete a teacher (Admin only)
   */
  async deleteTeacher(id: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Unassign batches
      await supabase
        .from('batch')
        .update({ teacher_id: null })
        .eq('teacher_id', id);

      // 2. Delete teacher
      const deleteRes = (await supabase
        .from('teachers')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      if (deleteRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${deleteRes.error.message}`,
        );
      }

      if (!deleteRes.data) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Teacher deleted successfully',
        data: deleteRes.data,
      };
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Failed to delete teacher ${id}:`, err);
      throw new InternalServerErrorException('Failed to delete teacher');
    }
  }

  /**
   * Assign batches to a teacher (Admin only)
   */
  async assignBatches(teacherId: string, batchIds: (string | number)[]) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Verify teacher exists
      const teacherRes = (await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .maybeSingle()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      if (!teacherRes.data) {
        throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
      }

      const teacher = teacherRes.data;

      // 2. Unassign previous batches for this teacher that are not in new batchIds
      const allBatchRes = (await supabase
        .from('batch')
        .select('id, teacher_id')
        .eq('teacher_id', teacherId)) as {
        data: { id: string | number }[] | null;
        error: { message: string } | null;
      };

      const currentAssigned = allBatchRes.data ?? [];
      const normalizedNewIds = batchIds.map(String);

      for (const curr of currentAssigned) {
        if (!normalizedNewIds.includes(String(curr.id))) {
          await supabase
            .from('batch')
            .update({ teacher_id: null })
            .eq('id', curr.id);
        }
      }

      // 3. Assign new batches to this teacher
      for (const bId of batchIds) {
        await supabase
          .from('batch')
          .update({
            teacher_id: teacherId,
            instructor: teacher.name,
          })
          .eq('id', bId);
      }

      // 4. Return updated teacher with newly assigned batches
      return this.findOneTeacher(teacherId);
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(
        `Failed to assign batches to teacher ${teacherId}:`,
        err,
      );
      throw new InternalServerErrorException('Failed to assign batches');
    }
  }

  /**
   * Remove a specific batch from a teacher
   */
  async removeBatch(teacherId: string, batchId: string | number) {
    const supabase = this.supabaseService.getClient();

    try {
      const updateRes = await supabase
        .from('batch')
        .update({ teacher_id: null })
        .eq('id', batchId)
        .eq('teacher_id', teacherId);

      if (updateRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${updateRes.error.message}`,
        );
      }

      return {
        success: true,
        message: 'Batch unassigned from teacher successfully',
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Failed to remove batch assignment:', err);
      throw new InternalServerErrorException(
        'Failed to remove batch assignment',
      );
    }
  }

  /**
   * Find teacher by email
   */
  async findByEmail(email: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const res = (await supabase
        .from('teachers')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()) as {
        data: TeacherRecord | null;
        error: { message: string } | null;
      };

      return res.data;
    } catch {
      return null;
    }
  }
}

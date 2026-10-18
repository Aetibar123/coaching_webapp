import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SubmitAttendanceDto,
  QueryAttendanceDto,
  AttendanceAnalyticsQueryDto,
} from './attendance.dto';

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

  /**
   * Helper to retrieve batches assigned to a teacher
  /**
   * Helper to retrieve batches assigned to a teacher
   */
  private async getTeacherBatchIds(
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

      if (!teacherRes.data) return [];

      const teacher = teacherRes.data;
      const batchIdSet = new Set<string | number>();

      // 1. Try finding batches assigned via teacher_id
      try {
        const byIdRes = (await supabase
          .from('batch')
          .select('id')
          .eq('teacher_id', teacher.id)) as {
          data: { id: string | number }[] | null;
        };
        (byIdRes.data ?? []).forEach((b) => batchIdSet.add(b.id));
      } catch {
        // Column teacher_id might not exist yet
      }

      // 2. Also match by instructor name
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
   * Retrieve aggregate attendance analytics:
   * Overall metrics, daily trend, monthly trend, and batch breakdown
   */
  async getAttendanceAnalytics(
    query?: AttendanceAnalyticsQueryDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const normalizedRole = userContext?.role?.toLowerCase();
      const userEmail = (userContext?.email || query?.teacher_email || query?.email)?.toLowerCase().trim();
      let isTeacher = normalizedRole === 'teacher';

      // Auto-detect teacher if role wasn't explicitly passed
      if (!isTeacher && normalizedRole !== 'admin' && userEmail) {
        try {
          const tRes = (await supabase
            .from('teachers')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle()) as { data: { id: string } | null };
          if (tRes.data) {
            isTeacher = true;
          }
        } catch {
          // Ignore
        }
      }

      let allowedBatchIds: (string | number)[] | null = null;

      if (isTeacher) {
        allowedBatchIds = await this.getTeacherBatchIds(userEmail);
        if (allowedBatchIds.length === 0) {
          const emptySummary = {
            totalRecords: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
            attendancePercentage: 0,
          };
          return {
            success: true,
            data: {
              overall: emptySummary,
              dailyTrend: [],
              monthlyTrend: [],
              batchBreakdown: [],
            },
            overall: emptySummary,
            dailyTrend: [],
            monthlyTrend: [],
            batchBreakdown: [],
          };
        }
      }

      // Query batches metadata for display names
      const batchesRes = (await supabase
        .from('batch')
        .select('id, name, course')) as {
        data: { id: string | number; name: string; course: string }[] | null;
        error: { message: string } | null;
      };

      const batchesMap = new Map<
        string,
        { id: string | number; name: string; course: string }
      >();
      (batchesRes.data ?? []).forEach((b) => {
        batchesMap.set(String(b.id), b);
      });

      // Build attendance query
      let req = supabase.from('attendance').select('*');

      if (query?.batch_id) {
        req = req.eq('batch_id', query.batch_id);
      } else if (allowedBatchIds !== null) {
        req = req.in('batch_id', allowedBatchIds);
      }

      if (query?.start_date) {
        const startDateStr = query.start_date.split('T')[0];
        req = req.gte('date', startDateStr);
      }
      if (query?.end_date) {
        const endDateStr = query.end_date.length === 10
          ? `${query.end_date} 23:59:59`
          : query.end_date;
        req = req.lte('date', endDateStr);
      }

      req = req.order('date', { ascending: true });

      const { data, error } = await req;
      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      interface AttItem {
        id: string | number;
        batch_id: string | number;
        student_id: string | number;
        date: string;
        status: string;
      }

      const records = (data as AttItem[]) ?? [];

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      const dailyMap = new Map<
        string,
        {
          date: string;
          total: number;
          present: number;
          absent: number;
          late: number;
          excused: number;
        }
      >();
      const monthlyMap = new Map<
        string,
        {
          month: string;
          label: string;
          total: number;
          present: number;
          absent: number;
        }
      >();
      const batchStatsMap = new Map<
        string,
        {
          batch_id: string | number;
          name: string;
          course: string;
          totalRecords: number;
          presentCount: number;
          absentCount: number;
        }
      >();

      for (const r of records) {
        const status = r.status.toLowerCase().trim();
        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else if (status === 'late') lateCount++;
        else if (status === 'excused') excusedCount++;

        // Daily trend grouping (normalize to YYYY-MM-DD)
        const dateKey = (r.date || '').split('T')[0].split(' ')[0];
        const currentDaily = dailyMap.get(dateKey) || {
          date: dateKey,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
        currentDaily.total++;
        if (status === 'present') currentDaily.present++;
        else if (status === 'absent') currentDaily.absent++;
        else if (status === 'late') currentDaily.late++;
        else if (status === 'excused') currentDaily.excused++;
        dailyMap.set(dateKey, currentDaily);

        // Monthly trend grouping (YYYY-MM)
        const monthKey = dateKey.substring(0, 7);
        const currentMonthly = monthlyMap.get(monthKey) || {
          month: monthKey,
          label: this.formatMonthLabel(monthKey),
          total: 0,
          present: 0,
          absent: 0,
        };
        currentMonthly.total++;
        if (status === 'present' || status === 'late') currentMonthly.present++;
        else if (status === 'absent') currentMonthly.absent++;
        monthlyMap.set(monthKey, currentMonthly);

        // Batch breakdown grouping
        const bKey = String(r.batch_id);
        const bMeta = batchesMap.get(bKey);
        const currentBatch = batchStatsMap.get(bKey) || {
          batch_id: r.batch_id,
          name: bMeta?.name ?? `Batch #${r.batch_id}`,
          course: bMeta?.course ?? 'General',
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
        };
        currentBatch.totalRecords++;
        if (status === 'present' || status === 'late')
          currentBatch.presentCount++;
        else if (status === 'absent') currentBatch.absentCount++;
        batchStatsMap.set(bKey, currentBatch);
      }

      const totalRecords = records.length;
      const attendancePercentage =
        totalRecords > 0
          ? Number(
              (((presentCount + lateCount) / totalRecords) * 100).toFixed(1),
            )
          : 0;

      const dailyTrend = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          ...d,
          percentage:
            d.total > 0
              ? Number((((d.present + d.late) / d.total) * 100).toFixed(1))
              : 0,
        }));

      const monthlyTrend = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((m) => ({
          ...m,
          percentage:
            m.total > 0 ? Number(((m.present / m.total) * 100).toFixed(1)) : 0,
        }));

      const batchBreakdown = Array.from(batchStatsMap.values()).map((b) => ({
        ...b,
        percentage:
          b.totalRecords > 0
            ? Number(((b.presentCount / b.totalRecords) * 100).toFixed(1))
            : 0,
      }));

      const summaryPayload = {
        overall: {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendancePercentage,
        },
        dailyTrend,
        monthlyTrend,
        batchBreakdown,
      };

      return {
        success: true,
        data: summaryPayload,
        ...summaryPayload,
      };
    } catch (error) {
      this.logger.error('Attendance Analytics Error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Failed to generate attendance analytics',
      );
    }
  }

  /**
   * Helper to format YYYY-MM into friendly label
   */
  private formatMonthLabel(yyyyMm: string): string {
    try {
      const parts = yyyyMm.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const d = new Date(year, month - 1, 1);
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return yyyyMm;
    }
  }

  /**
   * Retrieve student-wise attendance records with metrics and status ratings
   */
  async getStudentAttendanceReport(
    query?: AttendanceAnalyticsQueryDto,
    userContext?: { role?: string; email?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const normalizedRole = userContext?.role?.toLowerCase();
      const userEmail = (userContext?.email || query?.teacher_email || query?.email)?.toLowerCase().trim();
      let isTeacher = normalizedRole === 'teacher';

      // Auto-detect teacher if role wasn't explicitly passed
      if (!isTeacher && normalizedRole !== 'admin' && userEmail) {
        try {
          const tRes = (await supabase
            .from('teachers')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle()) as { data: { id: string } | null };
          if (tRes.data) {
            isTeacher = true;
          }
        } catch {
          // Ignore
        }
      }

      let allowedBatchIds: (string | number)[] | null = null;

      if (isTeacher) {
        allowedBatchIds = await this.getTeacherBatchIds(userEmail);
        if (allowedBatchIds.length === 0) {
          return { success: true, count: 0, data: [] };
        }
      }

      // Query students
      let studentReq = supabase
        .from('student')
        .select('id, name, email, batch_id');
      if (query?.batch_id) {
        studentReq = studentReq.eq('batch_id', query.batch_id);
      } else if (allowedBatchIds !== null) {
        studentReq = studentReq.in('batch_id', allowedBatchIds);
      }

      const studentsRes = (await studentReq) as {
        data:
          | {
              id: string | number;
              name: string;
              email: string;
              batch_id?: string | number;
            }[]
          | null;
        error: { message: string } | null;
      };

      if (studentsRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${studentsRes.error.message}`,
        );
      }

      const allStudents = studentsRes.data ?? [];

      // Query batches map for display names
      const batchesRes = (await supabase
        .from('batch')
        .select('id, name, course')) as {
        data: { id: string | number; name: string; course: string }[] | null;
        error: { message: string } | null;
      };
      const batchesMap = new Map<string, string>();
      (batchesRes.data ?? []).forEach((b) => {
        batchesMap.set(String(b.id), b.name);
      });

      // Query attendance within date range
      let attReq = supabase
        .from('attendance')
        .select('student_id, batch_id, date, status');
      if (query?.batch_id) {
        attReq = attReq.eq('batch_id', query.batch_id);
      } else if (allowedBatchIds !== null) {
        attReq = attReq.in('batch_id', allowedBatchIds);
      }
      if (query?.start_date) {
        const startDateStr = query.start_date.split('T')[0];
        attReq = attReq.gte('date', startDateStr);
      }
      if (query?.end_date) {
        const endDateStr = query.end_date.length === 10
          ? `${query.end_date} 23:59:59`
          : query.end_date;
        attReq = attReq.lte('date', endDateStr);
      }

      const attRes = (await attReq) as {
        data:
          | {
              student_id: string | number;
              batch_id: string | number;
              date: string;
              status: string;
            }[]
          | null;
        error: { message: string } | null;
      };

      if (attRes.error) {
        throw new BadRequestException(
          `Supabase Error: ${attRes.error.message}`,
        );
      }

      const attendanceRecords = attRes.data ?? [];

      // Group attendance counts by student_id
      const studentAttMap = new Map<
        string,
        {
          total: number;
          present: number;
          absent: number;
          late: number;
          excused: number;
        }
      >();
      for (const rec of attendanceRecords) {
        const sKey = String(rec.student_id);
        const curr = studentAttMap.get(sKey) || {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
        curr.total++;
        const st = rec.status.toLowerCase().trim();
        if (st === 'present') curr.present++;
        else if (st === 'absent') curr.absent++;
        else if (st === 'late') curr.late++;
        else if (st === 'excused') curr.excused++;
        studentAttMap.set(sKey, curr);
      }

      let reports = allStudents.map((s) => {
        const att = studentAttMap.get(String(s.id)) || {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
        const total = att.total;
        const attended = att.present + att.late;
        const percentage =
          total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;

        let statusBadge = 'No Data';
        if (total === 0) {
          statusBadge = 'No Data';
        } else if (percentage >= 90) {
          statusBadge = 'Excellent';
        } else if (percentage >= 75) {
          statusBadge = 'Good';
        } else if (percentage >= 50) {
          statusBadge = 'Average';
        } else {
          statusBadge = 'At Risk';
        }

        return {
          student_id: s.id,
          student_name: s.name,
          student_email: s.email,
          batch_id: s.batch_id ?? null,
          batch_name: s.batch_id
            ? (batchesMap.get(String(s.batch_id)) ?? `Batch #${s.batch_id}`)
            : 'Unassigned',
          total_days: total,
          present_days: att.present,
          absent_days: att.absent,
          late_days: att.late,
          attendance_percentage: percentage,
          status_badge: statusBadge,
        };
      });

      // Filter by search query if present
      if (query?.search) {
        const q = query.search.toLowerCase().trim();
        reports = reports.filter(
          (r) =>
            r.student_name.toLowerCase().includes(q) ||
            r.student_email.toLowerCase().includes(q) ||
            r.batch_name.toLowerCase().includes(q),
        );
      }

      // Sort by attendance percentage descending
      reports.sort((a, b) => b.attendance_percentage - a.attendance_percentage);

      return {
        success: true,
        count: reports.length,
        data: reports,
      };
    } catch (error) {
      this.logger.error('Student Attendance Report Error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Failed to generate student attendance report',
      );
    }
  }

  /**
   * Export attendance reports as CSV formatted string
   */
  async exportAttendanceCsv(
    query?: AttendanceAnalyticsQueryDto,
    userContext?: { role?: string; email?: string },
  ): Promise<{ filename: string; csv: string }> {
    const type = query?.type || 'students';
    const timestamp = new Date().toISOString().split('T')[0];

    if (type === 'daily') {
      const analytics = await this.getAttendanceAnalytics(query, userContext);
      const headers = [
        'Date',
        'Total Marked',
        'Present',
        'Absent',
        'Late',
        'Excused',
        'Attendance Rate (%)',
      ];
      const rows = analytics.dailyTrend.map((d) => [
        `"${d.date}"`,
        d.total,
        d.present,
        d.absent,
        d.late,
        d.excused,
        `${d.percentage}%`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n',
      );
      return { filename: `attendance-daily-trend-${timestamp}.csv`, csv };
    }

    if (type === 'batches') {
      const analytics = await this.getAttendanceAnalytics(query, userContext);
      const headers = [
        'Batch ID',
        'Batch Name',
        'Course',
        'Total Marked',
        'Present',
        'Absent',
        'Attendance Rate (%)',
      ];
      const rows = analytics.batchBreakdown.map((b) => [
        `"${b.batch_id}"`,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.course.replace(/"/g, '""')}"`,
        b.totalRecords,
        b.presentCount,
        b.absentCount,
        `${b.percentage}%`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n',
      );
      return { filename: `attendance-batch-report-${timestamp}.csv`, csv };
    }

    // Default: Student-wise report
    const studentReport = await this.getStudentAttendanceReport(
      query,
      userContext,
    );
    const headers = [
      'Student ID',
      'Student Name',
      'Email',
      'Batch',
      'Total Sessions',
      'Present Days',
      'Absent Days',
      'Late Days',
      'Attendance Rate (%)',
      'Status',
    ];
    const rows = studentReport.data.map((s) => [
      `"${s.student_id}"`,
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${s.student_email.replace(/"/g, '""')}"`,
      `"${s.batch_name.replace(/"/g, '""')}"`,
      s.total_days,
      s.present_days,
      s.absent_days,
      s.late_days,
      `${s.attendance_percentage}%`,
      `"${s.status_badge}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return { filename: `attendance-student-report-${timestamp}.csv`, csv };
  }
}

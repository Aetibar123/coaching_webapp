const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Student {
  id: string | number;
  name: string;
  email: string;
  phone_number: number;
  age: number;
  gender: string;
  batch_id?: string | number | null;
  created_at?: string;
}

export interface CreateStudentInput {
  name: string;
  email: string;
  phone_number: number;
  age: number;
  gender: string;
  batch_id?: string | number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  bio?: string;
  user_id?: string;
  created_at?: string;
  batches?: Batch[];
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  bio?: string;
}

export interface Batch {
  id: string | number;
  name: string;
  course: string;
  description?: string;
  instructor?: string;
  capacity?: number;
  fee?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  teacher_id?: string;
  teacher?: Teacher;
}

export interface CreateBatchInput {
  name: string;
  course: string;
  description?: string;
  instructor?: string;
  capacity?: number;
  fee?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  teacher_id?: string;
}

export interface BatchStats {
  batchId: string | number;
  name: string;
  course: string;
  status: string;
  enrolledStudents: number;
  capacity: number | null;
  availableSeats: number | null;
  occupancyRate: string | null;
  isFull: boolean;
}

export interface ClassItem {
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

export interface CreateClassInput {
  batch_id: string | number;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  room?: string;
  meeting_link?: string;
}

export interface RescheduleClassInput {
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  room?: string;
  meeting_link?: string;
}

export interface UpdateClassInput {
  title?: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  meeting_link?: string;
  status?: 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
}

export interface McqQuestion {
  id?: string;
  assignment_id?: string;
  question_text: string;
  options: string[];
  correct_option?: number; // Visible to teachers/admins
  points?: number;
  order_index?: number;
}

export interface Assignment {
  id: string;
  batch_id: string | number;
  batch_name?: string;
  course?: string;
  class_id?: string | null;
  class_title?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  total_points: number;
  created_by?: string | null;
  status: string;
  questions_count?: number;
  submissions_count?: number;
  created_at?: string;
  updated_at?: string;
  questions?: McqQuestion[];
}

export interface CreateAssignmentInput {
  batch_id: string | number;
  class_id?: string | null;
  title: string;
  description?: string;
  due_date?: string;
  questions: {
    question_text: string;
    options: string[];
    correct_option: number;
    points?: number;
  }[];
}

export interface SubmitAssignmentInput {
  student_id: string | number;
  student_email?: string;
  student_name?: string;
  answers: {
    question_id: string;
    selected_option: number;
  }[];
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string | number;
  student_name: string;
  student_email?: string;
  answers: {
    question_id: string;
    question_text: string;
    selected_option: number;
    correct_option?: number;
    is_correct: boolean;
    points_awarded: number;
    max_points: number;
  }[];
  score: number;
  total_points: number;
  percentage: number;
  status: string;
  submitted_at: string;
}

export interface AssignmentSubmissionsResult {
  assignment: Assignment;
  total_enrolled: number;
  submitted_count: number;
  average_score: number;
  submissions: AssignmentSubmission[];
  pending_students: { id: string | number; name: string; email: string }[];
}

export interface AttendanceRecord {
  id?: string | number;
  student_id: string | number;
  batch_id: string | number;
  date: string;
  status: string;
  created_at?: string;
}

export interface SubmitAttendanceInput {
  batch_id: string | number;
  date: string;
  students: {
    student_id: string | number;
    status: string;
  }[];
}

export interface AttendanceAnalyticsOverall {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface DailyTrendItem {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  month: string;
  label: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface BatchBreakdownItem {
  batch_id: string | number;
  name: string;
  course: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
}

export interface AttendanceAnalyticsSummary {
  overall: AttendanceAnalyticsOverall;
  dailyTrend: DailyTrendItem[];
  monthlyTrend: MonthlyTrendItem[];
  batchBreakdown: BatchBreakdownItem[];
}

export interface StudentAttendanceReportItem {
  student_id: string | number;
  student_name: string;
  student_email: string;
  batch_id?: string | number | null;
  batch_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  attendance_percentage: number;
  status_badge: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; count?: number }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeaders: Record<string, string> = {};

  if (typeof window !== "undefined") {
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }
      if (session?.user?.email) {
        authHeaders["x-user-email"] = session.user.email;
      }
      if (session?.user?.user_metadata?.role) {
        authHeaders["x-user-role"] = session.user.user_metadata.role;
      }
    } catch {
      // Ignore if session fetch fails
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg =
        json.message ||
        (Array.isArray(json.message) ? json.message.join(", ") : null) ||
        `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    return json;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error connecting to coaching API");
  }
}

export const api = {
  students: {
    list: async () => {
      const res = await request<Student[]>("/student");
      return res.data ?? [];
    },
    get: async (id: string | number) => {
      const res = await request<Student>(`/student/${id}`);
      return res.data;
    },
    create: async (data: CreateStudentInput) => {
      const res = await request<Student>("/student", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    update: async (id: string | number, data: Partial<CreateStudentInput>) => {
      const res = await request<Student>(`/student/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    delete: async (id: string | number) => {
      const res = await request<Student>(`/student/${id}`, {
        method: "DELETE",
      });
      return res.data;
    },
  },

  batches: {
    list: async (
      query?: {
        course?: string;
        status?: string;
        search?: string;
        teacher_id?: string;
        teacher_email?: string;
      },
      headers?: Record<string, string>
    ) => {
      const params = new URLSearchParams();
      if (query?.course) params.set("course", query.course);
      if (query?.status) params.set("status", query.status);
      if (query?.search) params.set("search", query.search);
      if (query?.teacher_id) params.set("teacher_id", query.teacher_id);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<Batch[]>(`/batch${qs}`, { headers });
      return res.data ?? [];
    },
    get: async (id: string | number, headers?: Record<string, string>) => {
      const res = await request<Batch>(`/batch/${id}`, { headers });
      return res.data;
    },
    create: async (data: CreateBatchInput, headers?: Record<string, string>) => {
      const res = await request<Batch>("/batch", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    update: async (
      id: string | number,
      data: Partial<CreateBatchInput>,
      headers?: Record<string, string>
    ) => {
      const res = await request<Batch>(`/batch/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    delete: async (id: string | number, headers?: Record<string, string>) => {
      const res = await request<Batch>(`/batch/${id}`, {
        method: "DELETE",
        headers,
      });
      return res.data;
    },
    getStudents: async (
      batchId: string | number,
      headers?: Record<string, string>
    ) => {
      const res = await request<Student[]>(`/batch/${batchId}/students`, {
        headers,
      });
      return res.data ?? [];
    },
    getStats: async (
      batchId: string | number,
      headers?: Record<string, string>
    ) => {
      const res = await request<BatchStats>(`/batch/${batchId}/stats`, {
        headers,
      });
      return res.data;
    },
    assignStudent: async (
      batchId: string | number,
      studentId: string | number
    ) => {
      const res = await request<{ student: Student; batch: Partial<Batch> }>(
        `/batch/${batchId}/students`,
        {
          method: "POST",
          body: JSON.stringify({ student_id: studentId }),
        }
      );
      return res.data;
    },
    removeStudent: async (
      batchId: string | number,
      studentId: string | number
    ) => {
      const res = await request<Student>(
        `/batch/${batchId}/students/${studentId}`,
        {
          method: "DELETE",
        }
      );
      return res.data;
    },
  },

  attendance: {
    submit: async (payload: SubmitAttendanceInput) => {
      const res = await request<AttendanceRecord[]>("/attendance", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res;
    },
    list: async (query?: {
      batch_id?: string;
      date?: string;
      student_id?: string;
    }) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.date) params.set("date", query.date);
      if (query?.student_id) params.set("student_id", query.student_id);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<AttendanceRecord[]>(`/attendance${qs}`);
      return res.data ?? [];
    },
    getByBatch: async (batchId: string | number, date?: string) => {
      const qs = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await request<AttendanceRecord[]>(
        `/attendance/batch/${batchId}${qs}`
      );
      return res.data ?? [];
    },
    getAnalyticsSummary: async (
      query?: {
        batch_id?: string;
        start_date?: string;
        end_date?: string;
        teacher_email?: string;
        role?: string;
      },
      headers?: Record<string, string>
    ) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.start_date) params.set("start_date", query.start_date);
      if (query?.end_date) params.set("end_date", query.end_date);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);
      if (query?.role) params.set("role", query.role);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<AttendanceAnalyticsSummary>(
        `/attendance/analytics/summary${qs}`,
        { headers }
      );
      const raw = res as unknown as {
        data?: AttendanceAnalyticsSummary;
        overall?: AttendanceAnalyticsOverall;
        dailyTrend?: DailyTrendItem[];
        monthlyTrend?: MonthlyTrendItem[];
        batchBreakdown?: BatchBreakdownItem[];
      };
      if (raw.data?.overall) {
        return raw.data;
      }
      if (raw.overall) {
        return {
          overall: raw.overall,
          dailyTrend: raw.dailyTrend ?? [],
          monthlyTrend: raw.monthlyTrend ?? [],
          batchBreakdown: raw.batchBreakdown ?? [],
        };
      }
      return {
        overall: {
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          attendancePercentage: 0,
        },
        dailyTrend: [],
        monthlyTrend: [],
        batchBreakdown: [],
      };
    },
    getStudentReport: async (
      query?: {
        batch_id?: string;
        start_date?: string;
        end_date?: string;
        search?: string;
        teacher_email?: string;
        role?: string;
      },
      headers?: Record<string, string>
    ) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.start_date) params.set("start_date", query.start_date);
      if (query?.end_date) params.set("end_date", query.end_date);
      if (query?.search) params.set("search", query.search);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);
      if (query?.role) params.set("role", query.role);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<StudentAttendanceReportItem[]>(
        `/attendance/analytics/student-report${qs}`,
        { headers }
      );
      return res.data ?? [];
    },
    exportCsvUrl: (query?: {
      batch_id?: string;
      start_date?: string;
      end_date?: string;
      type?: string;
      teacher_email?: string;
      role?: string;
    }) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.start_date) params.set("start_date", query.start_date);
      if (query?.end_date) params.set("end_date", query.end_date);
      if (query?.type) params.set("type", query.type);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);
      if (query?.role) params.set("role", query.role);

      const qs = params.toString() ? `?${params.toString()}` : "";
      return `${API_BASE_URL}/attendance/analytics/export${qs}`;
    },
  },

  teachers: {
    list: async () => {
      const res = await request<Teacher[]>("/teacher");
      return res.data ?? [];
    },
    get: async (id: string) => {
      const res = await request<Teacher>(`/teacher/${id}`);
      return res.data;
    },
    create: async (data: CreateTeacherInput) => {
      const res = await request<Teacher>("/teacher", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    update: async (id: string, data: Partial<CreateTeacherInput>) => {
      const res = await request<Teacher>(`/teacher/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    delete: async (id: string) => {
      const res = await request<Teacher>(`/teacher/${id}`, {
        method: "DELETE",
      });
      return res.data;
    },
    assignBatches: async (id: string, batchIds: (string | number)[]) => {
      const res = await request<Teacher>(`/teacher/${id}/batches`, {
        method: "POST",
        body: JSON.stringify({ batch_ids: batchIds }),
      });
      return res.data;
    },
    myBatches: async () => {
      const res = await request<Batch[]>("/teacher/me/batches");
      return res.data ?? [];
    },
  },

  classes: {
    list: async (
      query?: {
        batch_id?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
        search?: string;
        teacher_email?: string;
        student_id?: string;
      },
      headers?: Record<string, string>
    ) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.start_date) params.set("start_date", query.start_date);
      if (query?.end_date) params.set("end_date", query.end_date);
      if (query?.status) params.set("status", query.status);
      if (query?.search) params.set("search", query.search);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);
      if (query?.student_id) params.set("student_id", query.student_id);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<ClassItem[]>(`/classes${qs}`, { headers });
      return res.data ?? [];
    },
    upcoming: async (limit = 5, headers?: Record<string, string>) => {
      const res = await request<ClassItem[]>(`/classes/upcoming?limit=${limit}`, {
        headers,
      });
      return res.data ?? [];
    },
    get: async (id: string) => {
      const res = await request<ClassItem>(`/classes/${id}`);
      return res.data;
    },
    create: async (data: CreateClassInput, headers?: Record<string, string>) => {
      const res = await request<ClassItem>("/classes", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    reschedule: async (
      id: string,
      data: RescheduleClassInput,
      headers?: Record<string, string>
    ) => {
      const res = await request<ClassItem>(`/classes/${id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    update: async (
      id: string,
      data: UpdateClassInput,
      headers?: Record<string, string>
    ) => {
      const res = await request<ClassItem>(`/classes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    delete: async (id: string, headers?: Record<string, string>) => {
      const res = await request<ClassItem>(`/classes/${id}`, {
        method: "DELETE",
        headers,
      });
      return res.data;
    },
  },
  assignments: {
    list: async (
      query?: { batch_id?: string; class_id?: string; teacher_email?: string },
      headers?: Record<string, string>
    ) => {
      const params = new URLSearchParams();
      if (query?.batch_id) params.set("batch_id", query.batch_id);
      if (query?.class_id) params.set("class_id", query.class_id);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<Assignment[]>(`/assignments${qs}`, { headers });
      return res.data ?? [];
    },
    get: async (id: string, headers?: Record<string, string>) => {
      const res = await request<Assignment>(`/assignments/${id}`, { headers });
      return res.data;
    },
    create: async (data: CreateAssignmentInput, headers?: Record<string, string>) => {
      const res = await request<Assignment>("/assignments", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
      return res.data;
    },
    submit: async (id: string, data: SubmitAssignmentInput) => {
      const res = await request<AssignmentSubmission>(`/assignments/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res;
    },
    getSubmissions: async (id: string, headers?: Record<string, string>) => {
      const res = await request<AssignmentSubmissionsResult>(`/assignments/${id}/submissions`, {
        headers,
      });
      return res.data;
    },
    delete: async (id: string, headers?: Record<string, string>) => {
      const res = await request<{ success: boolean; message: string }>(`/assignments/${id}`, {
        method: "DELETE",
        headers,
      });
      return res.data;
    },
  },
};


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
    list: async (query?: {
      course?: string;
      status?: string;
      search?: string;
      teacher_id?: string;
      teacher_email?: string;
    }) => {
      const params = new URLSearchParams();
      if (query?.course) params.set("course", query.course);
      if (query?.status) params.set("status", query.status);
      if (query?.search) params.set("search", query.search);
      if (query?.teacher_id) params.set("teacher_id", query.teacher_id);
      if (query?.teacher_email) params.set("teacher_email", query.teacher_email);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request<Batch[]>(`/batch${qs}`);
      return res.data ?? [];
    },
    get: async (id: string | number) => {
      const res = await request<Batch>(`/batch/${id}`);
      return res.data;
    },
    create: async (data: CreateBatchInput) => {
      const res = await request<Batch>("/batch", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    update: async (id: string | number, data: Partial<CreateBatchInput>) => {
      const res = await request<Batch>(`/batch/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    delete: async (id: string | number) => {
      const res = await request<Batch>(`/batch/${id}`, {
        method: "DELETE",
      });
      return res.data;
    },
    getStudents: async (batchId: string | number) => {
      const res = await request<Student[]>(`/batch/${batchId}/students`);
      return res.data ?? [];
    },
    getStats: async (batchId: string | number) => {
      const res = await request<BatchStats>(`/batch/${batchId}/stats`);
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
};


import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  api,
  type Batch,
  type AttendanceAnalyticsSummary,
  type StudentAttendanceReportItem,
} from "@/lib/api";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "teacher";
  let batches: Batch[] = [];
  let initialSummary: AttendanceAnalyticsSummary | null = null;
  let initialStudentReport: StudentAttendanceReportItem[] = [];

  // Default date range: Last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  try {
    const authHeaders = {
      "x-user-role": user.role || "",
      "x-user-email": user.email || "",
    };

    const [batchesData, summaryData, studentData] = await Promise.all([
      isTeacher
        ? api.batches.list({ teacher_email: user.email })
        : api.batches.list(),
      api.attendance.getAnalyticsSummary(
        {
          start_date: startDate,
          end_date: endDate,
          teacher_email: isTeacher ? user.email : undefined,
          role: user.role,
        },
        authHeaders
      ),
      api.attendance.getStudentReport(
        {
          start_date: startDate,
          end_date: endDate,
          teacher_email: isTeacher ? user.email : undefined,
          role: user.role,
        },
        authHeaders
      ),
    ]);

    batches = batchesData;
    initialSummary = summaryData;
    initialStudentReport = studentData;
  } catch (err) {
    console.error("Failed to load attendance reports data:", err);
  }

  return (
    <AppShell user={user}>
      <ReportsClient
        batches={batches}
        initialSummary={initialSummary}
        initialStudentReport={initialStudentReport}
        initialStartDate={startDate}
        initialEndDate={endDate}
        userRole={user.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}


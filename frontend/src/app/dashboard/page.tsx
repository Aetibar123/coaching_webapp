import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Batch, type Student, type ClassItem } from "@/lib/api";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch batches, students, and scheduled classes from the backend API
  let batches: Batch[] = [];
  let students: Student[] = [];
  let upcomingClasses: ClassItem[] = [];

  const authHeaders = {
    "x-user-role": user.role || "",
    "x-user-email": user.email || "",
  };

  try {
    const isTeacher = user.role === "teacher";
    const [batchesData, studentsData, classesData] = await Promise.all([
      isTeacher
        ? api.batches.list({ teacher_email: user.email })
        : api.batches.list(),
      api.students.list(),
      api.classes.upcoming(10, authHeaders),
    ]);
    batches = batchesData;
    upcomingClasses = classesData;

    if (isTeacher) {
      const assignedBatchIds = new Set(batches.map((b) => String(b.id)));
      students = studentsData.filter(
        (s) => s.batch_id && assignedBatchIds.has(String(s.batch_id))
      );
    } else {
      students = studentsData;
    }
  } catch {
    // If backend is booting, keep empty lists
  }

  return (
    <AppShell user={user}>
      <DashboardClient
        initialBatches={batches}
        initialStudents={students}
        initialClasses={upcomingClasses}
        userName={user.fullName || "User"}
        userRole={user.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}

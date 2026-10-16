import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Batch, type Student } from "@/lib/api";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch batches and students from the backend API
  let batches: Batch[] = [];
  let students: Student[] = [];

  try {
    const isTeacher = user.role === "teacher";
    const [batchesData, studentsData] = await Promise.all([
      isTeacher
        ? api.batches.list({ teacher_email: user.email })
        : api.batches.list(),
      api.students.list(),
    ]);
    batches = batchesData;

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
        userName={user.fullName || "User"}
      />
    </AppShell>
  );
}

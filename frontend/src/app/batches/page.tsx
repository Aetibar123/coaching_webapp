import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Batch, type Student, type Teacher } from "@/lib/api";
import { BatchesClient } from "./BatchesClient";

export default async function BatchesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let batches: Batch[] = [];
  let students: Student[] = [];
  let teachers: Teacher[] = [];

  const isTeacher = user.role === "teacher";

  try {
    const [batchesData, studentsData, teachersData] = await Promise.all([
      isTeacher
        ? api.batches.list({ teacher_email: user.email })
        : api.batches.list(),
      api.students.list(),
      api.teachers.list().catch(() => []),
    ]);
    batches = batchesData;
    students = studentsData;
    teachers = teachersData;
  } catch (error) {
    console.error("Failed to load batches:", error);
  }

  return (
    <AppShell user={user}>
      <BatchesClient
        initialBatches={batches}
        allStudents={students}
        allTeachers={teachers}
        userRole={user.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}

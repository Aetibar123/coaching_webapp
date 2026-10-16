import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Student, type Batch } from "@/lib/api";
import { StudentsClient } from "./StudentsClient";

export default async function StudentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let students: Student[] = [];
  let batches: Batch[] = [];

  try {
    const [studentsData, batchesData] = await Promise.all([
      api.students.list(),
      api.batches.list(),
    ]);
    students = studentsData;
    batches = batchesData;
  } catch (err) {
    console.error("Failed to load students data:", err);
  }

  return (
    <AppShell user={user}>
      <StudentsClient
        initialStudents={students}
        batches={batches}
        userRole={user.role}
      />
    </AppShell>
  );
}

import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  api,
  type Batch,
  type ClassItem,
  type Assignment,
  type Student,
} from "@/lib/api";
import { AssignmentsClient } from "./AssignmentsClient";

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "teacher";
  let batches: Batch[] = [];
  let classes: ClassItem[] = [];
  let assignments: Assignment[] = [];
  let students: Student[] = [];

  const authHeaders = {
    "x-user-role": user.role || "",
    "x-user-email": user.email || "",
  };

  try {
    const [batchesData, classesData, assignmentsData, studentsData] =
      await Promise.all([
        isTeacher
          ? api.batches.list({ teacher_email: user.email })
          : api.batches.list(),
        api.classes.list(
          {
            teacher_email: isTeacher ? user.email : undefined,
          },
          authHeaders
        ),
        api.assignments.list(
          {
            teacher_email: isTeacher ? user.email : undefined,
          },
          authHeaders
        ),
        api.students.list(),
      ]);

    batches = batchesData;
    classes = classesData;
    assignments = assignmentsData;
    students = studentsData;
  } catch (err) {
    console.error("Failed to load assignments data:", err);
  }

  return (
    <AppShell user={user}>
      <AssignmentsClient
        initialAssignments={assignments}
        batches={batches}
        classes={classes}
        students={students}
        userRole={user.role}
        userEmail={user.email}
        userName={user.fullName}
      />
    </AppShell>
  );
}


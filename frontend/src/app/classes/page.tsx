import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Batch, type ClassItem } from "@/lib/api";
import { ClassesClient } from "./ClassesClient";

export default async function ClassesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "teacher";
  let batches: Batch[] = [];
  let initialClasses: ClassItem[] = [];

  const authHeaders = {
    "x-user-role": user.role || "",
    "x-user-email": user.email || "",
  };

  try {
    const [batchesData, classesData] = await Promise.all([
      isTeacher
        ? api.batches.list({ teacher_email: user.email })
        : api.batches.list(),
      api.classes.list(
        {
          teacher_email: isTeacher ? user.email : undefined,
        },
        authHeaders
      ),
    ]);

    batches = batchesData;
    initialClasses = classesData;
  } catch (err) {
    console.error("Failed to load classes schedule:", err);
  }

  return (
    <AppShell user={user}>
      <ClassesClient
        batches={batches}
        initialClasses={initialClasses}
        userRole={user.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}


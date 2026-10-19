import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Batch } from "@/lib/api";
import { AttendanceClient } from "./AttendanceClient";
import { Suspense } from "react";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let batches: Batch[] = [];
  try {
    const isTeacher = user.role === "teacher";
    const authHeaders = {
      "x-user-role": user.role || "",
      "x-user-email": user.email || "",
    };
    batches = isTeacher
      ? await api.batches.list({ teacher_email: user.email }, authHeaders)
      : await api.batches.list(undefined, authHeaders);
  } catch (err) {
    console.error("Failed to load batches for attendance:", err);
  }

  return (
    <AppShell user={user}>
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-slate-400">
            Loading attendance system...
          </div>
        }
      >
        <AttendanceClient batches={batches} />
      </Suspense>
    </AppShell>
  );
}

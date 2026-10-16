import { getCurrentUser } from "@/utils/getUser";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type Teacher, type Batch } from "@/lib/api";
import { TeachersClient } from "./TeachersClient";

export default async function TeachersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Only admin can access the Teacher Management module
  if (user.role !== "admin") {
    redirect("/batches");
  }

  let teachers: Teacher[] = [];
  let batches: Batch[] = [];

  try {
    const [teachersData, batchesData] = await Promise.all([
      api.teachers.list(),
      api.batches.list(),
    ]);
    teachers = teachersData;
    batches = batchesData;
  } catch (err) {
    console.error("Failed to load teachers or batches data:", err);
  }

  return (
    <AppShell user={user}>
      <TeachersClient initialTeachers={teachers} allBatches={batches} />
    </AppShell>
  );
}


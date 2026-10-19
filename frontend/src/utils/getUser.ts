import { createClient } from "@/utils/supabase/server";

export interface AppUser {
  id: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
  role: "admin" | "teacher" | "student";
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let role: "admin" | "teacher" | "student" = "teacher";

  try {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      role = "admin";
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        const r = profile.role.toLowerCase();
        role = r === "admin" ? "admin" : r === "student" ? "student" : "teacher";
      } else if (user.user_metadata?.role) {
        const r = String(user.user_metadata.role).toLowerCase();
        role = r === "admin" ? "admin" : r === "student" ? "student" : "teacher";
      }
    }
  } catch {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      role = "admin";
    } else if (user.user_metadata?.role) {
      const r = String(user.user_metadata.role).toLowerCase();
      role = r === "admin" ? "admin" : r === "student" ? "student" : "teacher";
    }
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  // If user is a teacher, ensure they exist in teachers table so admin can see and assign cohorts
  if (role === "teacher" && user.email) {
    try {
      const { data: tData } = await supabase
        .from("teachers")
        .select("id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();

      if (!tData) {
        await supabase.from("teachers").insert({
          name: fullName,
          email: user.email.toLowerCase().trim(),
          subject: "Faculty",
        });
      }
    } catch {
      // Ignore background insert failure
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName,
    avatarUrl:
      user.user_metadata?.avatar_url || user.user_metadata?.picture,
    role,
  };
}


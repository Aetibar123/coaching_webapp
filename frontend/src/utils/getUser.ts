import { createClient } from "@/utils/supabase/server";

export interface AppUser {
  id: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
  role: "admin" | "teacher";
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let role: "admin" | "teacher" = "teacher";

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
        role =
          profile.role.toLowerCase() === "admin" ? "admin" : "teacher";
      } else if (user.user_metadata?.role) {
        role =
          String(user.user_metadata.role).toLowerCase() === "admin"
            ? "admin"
            : "teacher";
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
      role =
        String(user.user_metadata.role).toLowerCase() === "admin"
          ? "admin"
          : "teacher";
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    avatarUrl:
      user.user_metadata?.avatar_url || user.user_metadata?.picture,
    role,
  };
}


"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { LEVELS } from "@/lib/types";
import type { FormState } from "./auth";

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const { sb, user } = await getUser();
  if (!user) return { error: "Sign in required." };
  const goal = Math.floor(Number(fd.get("daily_word_goal")));
  const level = String(fd.get("target_cefr") ?? "");
  const theme = String(fd.get("theme") ?? "system");
  if (!(goal >= 1 && goal <= 200)) return { error: "Daily goal must be between 1 and 200." };
  if (level && !(LEVELS as readonly string[]).includes(level)) return { error: "Invalid level." };
  if (!["light", "dark", "system"].includes(theme)) return { error: "Invalid theme." };
  const { error } = await sb.from("user_profiles").upsert({ user_id: user.id, display_name: String(fd.get("display_name") ?? "").trim().slice(0, 60) || null, target_cefr: level || null, daily_word_goal: goal, theme });
  if (error) return { error: error.message };
  (await cookies()).set("theme", theme, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  return { message: "Settings saved." };
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const { sb, user } = await getUser();
  if (!user) return { error: "Sign in required." };
  if (String(fd.get("confirm") ?? "") !== "DELETE") return { error: "Type DELETE to confirm." };
  try {
    const { error } = await createServiceClient().auth.admin.deleteUser(user.id);   // cascades to all of this user's rows
    if (error) return { error: error.message };
  } catch (e) { return { error: (e as Error).message }; }
  await sb.auth.signOut();
  redirect("/");
}

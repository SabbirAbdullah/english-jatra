import { createClient } from "./supabase/server";

export async function getUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}
export async function isAdmin(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin";
}
/** Server-side admin gate. Throws; callers turn that into a 401/403 response. */
export async function requireAdmin() {
  const { sb, user } = await getUser();
  if (!user) throw new Error("Sign in required");
  if (!(await isAdmin(sb, user.id))) throw new Error("Administrator access required");
  return { sb, user };
}

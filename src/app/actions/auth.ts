"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | undefined;
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email: String(fd.get("email") ?? "").trim(), password: String(fd.get("password") ?? "") });
  if (error) return { error: error.message };
  redirect(safeNext(String(fd.get("next") ?? "/")));
}

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "Passwords do not match." };
  const sb = await createClient();
  const { data, error } = await sb.auth.signUp({ email: String(fd.get("email") ?? "").trim(), password, options: { emailRedirectTo: `${SITE()}/auth/callback` } });
  if (error) return { error: error.message };
  if (data.session) redirect("/");
  return { message: "Account created. Check your email and click the confirmation link, then sign in." };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await createClient();
  const { error } = await sb.auth.resetPasswordForEmail(String(fd.get("email") ?? "").trim(), { redirectTo: `${SITE()}/auth/callback?next=/settings/password` });
  if (error) return { error: error.message };
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "Passwords do not match." };
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ password });
  return error ? { error: error.message } : { message: "Password updated." };
}

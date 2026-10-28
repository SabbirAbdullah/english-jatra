import Link from "next/link";
import { getUser } from "@/lib/auth";
import { DeleteForm, ProfileForm } from "@/components/SettingsForms";

export const metadata = { title: "Settings" };
export default async function Page() {
  const { sb, user } = await getUser();
  if (!user) return null;
  const { data } = await sb.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h1">Settings</h1>
      <section className="card space-y-1"><h2 className="h2">Account</h2><p className="text-sm muted">{user.email}</p><Link className="text-sm underline" href="/settings/password">Change password</Link></section>
      <section className="card space-y-3"><h2 className="h2">Learning preferences</h2><ProfileForm p={{ display_name: data?.display_name ?? null, target_cefr: data?.target_cefr ?? null, daily_word_goal: data?.daily_word_goal ?? 10, theme: data?.theme ?? "system" }} /></section>
      <section className="card space-y-2"><h2 className="h2">Your data</h2><p className="text-sm muted">Download everything stored about your account (profile, progress, saved words, quizzes, sentences, IELTS drafts) as JSON. Your data is private to you and is retained until you delete your account.</p><a className="btn-ghost" href="/api/me/export" download>Export my data</a></section>
      <section className="card space-y-2 border-red-200 dark:border-red-900"><h2 className="h2 text-red-700 dark:text-red-300">Delete account</h2><DeleteForm /></section>
    </div>
  );
}

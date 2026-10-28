"use client";
import { useActionState } from "react";
import { deleteAccountAction, updateProfileAction } from "@/app/actions/settings";
import { LEVELS } from "@/lib/types";
import { Notice } from "./ui";

export function ProfileForm({ p }: { p: { display_name: string | null; target_cefr: string | null; daily_word_goal: number; theme: string } }) {
  const [s, a, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={a} className="space-y-4">
      <div><label className="label" htmlFor="dn">Display name</label><input id="dn" name="display_name" className="input" maxLength={60} defaultValue={p.display_name ?? ""} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="tc">Target level</label><select id="tc" name="target_cefr" className="input" defaultValue={p.target_cefr ?? ""}><option value="">Not set</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="dg">Daily word goal</label><input id="dg" name="daily_word_goal" type="number" min={1} max={200} className="input" defaultValue={p.daily_word_goal} /></div>
        <div><label className="label" htmlFor="th">Theme</label><select id="th" name="theme" className="input" defaultValue={p.theme}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      </div>
      {s?.error && <Notice kind="error">{s.error}</Notice>}{s?.message && <Notice kind="ok">{s.message}</Notice>}
      <button className="btn-primary" disabled={pending}>Save settings</button>
    </form>
  );
}

export function DeleteForm() {
  const [s, a, pending] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={a} className="space-y-3">
      <p className="text-sm">Permanently deletes your account and all progress, saved words, quiz history, sentences and IELTS drafts. This cannot be undone.</p>
      <div><label className="label" htmlFor="cf">Type DELETE to confirm</label><input id="cf" name="confirm" className="input max-w-xs" autoComplete="off" /></div>
      {s?.error && <Notice kind="error">{s.error}</Notice>}
      <button className="btn-danger" disabled={pending}>Delete my account</button>
    </form>
  );
}

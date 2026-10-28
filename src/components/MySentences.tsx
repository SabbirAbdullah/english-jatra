"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePracticeSentenceAction, savePracticeSentenceAction } from "@/app/actions/learn";

export function MySentences({ items }: { items: { id: string; sentence: string; created_at: string }[] }) {
  const router = useRouter(); const [edit, setEdit] = useState<string | null>(null), [val, setVal] = useState(""), [pending, start] = useTransition();
  if (!items.length) return <p className="text-sm muted">You have not saved any sentences yet.</p>;
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">{items.map((s) => (
      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        {edit === s.id ? <><input className="input flex-1" value={val} maxLength={500} onChange={(e) => setVal(e.target.value)} aria-label="Edit sentence" />
          <button className="btn-primary !py-1" disabled={pending} onClick={() => start(async () => { await savePracticeSentenceAction(val, null, undefined, s.id); setEdit(null); router.refresh(); })}>Save</button><button className="btn-ghost !py-1" onClick={() => setEdit(null)}>Cancel</button></>
          : <><span className="flex-1">{s.sentence}</span><button className="btn-ghost !py-1" onClick={() => { setEdit(s.id); setVal(s.sentence); }}>Edit</button><button className="btn-ghost !py-1" disabled={pending} onClick={() => start(async () => { await deletePracticeSentenceAction(s.id); router.refresh(); })}>Delete</button></>}
      </li>))}</ul>
  );
}

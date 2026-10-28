"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WRITING } from "@/lib/ielts-content";
import { deleteResponseAction, saveResponseAction } from "@/app/actions/ielts";
import { wordCount } from "@/lib/checks";
import { Notice } from "./ui";

interface Hist { id: string; task: string; prompt: string; body: string; word_count: number; status: string; updated_at: string }
const ALL = [...WRITING.task1.map((t) => ({ ...t, kind: "task1" })), ...WRITING.task2.map((t) => ({ ...t, kind: "task2", table: undefined }))];

export function IeltsWriting({ history, signedIn }: { history: Hist[]; signedIn: boolean }) {
  const router = useRouter();
  const [pid, setPid] = useState(ALL[0].id), [text, setText] = useState(""), [rid, setRid] = useState<string | undefined>(), [msg, setMsg] = useState(""), [notes, setNotes] = useState<string[]>([]), [pending, start] = useTransition();
  const p = ALL.find((x) => x.id === pid)!, words = wordCount(text);
  const save = (status: "draft" | "submitted") => start(async () => {
    const r = await saveResponseAction({ module: "writing", task: p.kind, prompt: p.prompt, body: text, status, minWords: p.min, id: rid });
    if (!r.ok) return r.error === "AUTH" ? router.push("/login?next=/ielts/writing") : setMsg(r.error);
    setRid(r.id); setNotes(r.notes); setMsg(status === "draft" ? "Draft saved." : "Submitted and saved."); router.refresh();
  });
  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3"><div><label className="label" htmlFor="wp">Prompt</label><select id="wp" className="input" value={pid} onChange={(e) => { setPid(e.target.value); setRid(undefined); setNotes([]); }}>{ALL.map((x, i) => <option key={x.id} value={x.id}>{x.kind === "task1" ? "Task 1" : "Task 2"} · {i + 1}</option>)}</select></div></div>
        <p>{p.prompt}</p>
        {p.table && <div className="overflow-x-auto"><table className="text-sm"><thead><tr>{p.table.head.map((h) => <th key={h} className="border border-slate-300 px-3 py-1 text-left dark:border-slate-700">{h}</th>)}</tr></thead><tbody>{p.table.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className="border border-slate-300 px-3 py-1 dark:border-slate-700">{c}</td>)}</tr>)}</tbody></table><p className="mt-1 text-xs muted">{WRITING.note}</p></div>}
      </div>
      <div className="card space-y-3">
        <label className="label" htmlFor="we">Your response</label>
        <textarea id="we" className="input min-h-72" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-2"><span className={`text-sm ${words >= p.min ? "text-emerald-600" : "muted"}`}>{words} words (minimum {p.min})</span>
          <div className="flex gap-2"><button className="btn-ghost" disabled={pending || !text.trim()} onClick={() => save("draft")}>Save draft</button><button className="btn-primary" disabled={pending || !text.trim()} onClick={() => save("submitted")}>Submit &amp; check</button></div></div>
        {!signedIn && <p className="text-xs muted">Sign in to save drafts and see your submission history.</p>}
        {msg && <p role="status" className="text-sm muted">{msg}</p>}
        {notes.length > 0 && <Notice kind="info"><ul className="list-disc pl-4">{notes.map((n) => <li key={n}>{n}</li>)}</ul><p className="mt-1 text-xs">These are basic automatic checks (length, structure, repetition). They do not assess grammar accuracy, task response or give an IELTS band. AI feedback is not configured.</p></Notice>}
      </div>
      {history.length > 0 && <div className="card space-y-2"><h2 className="h2">Your drafts and submissions</h2>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">{history.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><p className="truncate">{h.prompt}</p><p className="text-xs muted">{h.status} · {h.word_count} words · {new Date(h.updated_at).toLocaleString()}</p></div>
            <div className="flex shrink-0 gap-2"><button className="btn-ghost !py-1" onClick={() => { const m = ALL.find((x) => x.prompt === h.prompt); if (m) setPid(m.id); setText(h.body); setRid(h.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Open</button>
              <button className="btn-ghost !py-1" onClick={() => start(async () => { await deleteResponseAction(h.id); router.refresh(); })}>Delete</button></div></li>))}</ul></div>}
    </div>
  );
}

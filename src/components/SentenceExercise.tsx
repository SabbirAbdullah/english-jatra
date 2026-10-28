"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkSentenceAction, savePracticeSentenceAction } from "@/app/actions/learn";
import { Notice } from "./ui";

export function SentenceExercise({ wordId, word, prompt }: { wordId?: string; word?: string; prompt?: string | null }) {
  const router = useRouter(); const [text, setText] = useState(""); const [notes, setNotes] = useState<string[]>([]); const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {prompt && <p className="text-sm">{prompt}</p>}
      <label className="label" htmlFor="sx">Your sentence</label>
      <textarea id="sx" className="input min-h-20" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-ghost" disabled={pending || !text.trim()} onClick={() => start(async () => setNotes(await checkSentenceAction(text, word)))}>Check</button>
        <button className="btn-primary" disabled={pending || !text.trim()} onClick={() => start(async () => {
          const r = await savePracticeSentenceAction(text, wordId, word);
          if (r.error === "AUTH") return router.push("/login?next=" + encodeURIComponent(location.pathname));
          setNotes(r.notes ?? []); setMsg(r.ok ? "Saved to My sentences." : r.error ?? "Could not save."); if (r.ok) { setText(""); router.refresh(); }
        })}>Save sentence</button>
      </div>
      {notes.length > 0 && <Notice kind="info"><ul className="list-disc pl-4">{notes.map((n) => <li key={n}>{n}</li>)}</ul><p className="mt-1 text-xs opacity-80">Automatic checks only; they can miss errors.</p></Notice>}
      {msg && <p role="status" className="text-sm muted">{msg}</p>}
    </div>
  );
}

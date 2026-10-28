"use client";
import { useState, useTransition } from "react";
import { READING } from "@/lib/ielts-content";
import { gradeReadingAction } from "@/app/actions/ielts";

type Res = Awaited<ReturnType<typeof gradeReadingAction>>;
export function ReadingPractice() {
  const [a, setA] = useState<Record<string, string>>({}), [res, setRes] = useState<Res | null>(null), [pending, start] = useTransition();
  const r = (id: string) => res?.results.find((x) => x.id === id);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="card space-y-3 lg:sticky lg:top-20 lg:h-fit"><h2 className="h2">{READING.title}</h2>{READING.passage.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}<p className="text-xs muted">{READING.note}</p></article>
      <div className="space-y-3">
        {res && <div className="card text-center"><p className="text-3xl font-bold">{res.score}/{res.total}</p><button className="btn-ghost mt-2" onClick={() => { setRes(null); setA({}); }}>Try again</button></div>}
        {READING.questions.map((q, n) => {
          const x = r(q.id);
          return (
            <fieldset key={q.id} className={`card space-y-2 !p-4 ${x ? (x.correct ? "border-emerald-300 dark:border-emerald-800" : "border-red-300 dark:border-red-800") : ""}`}>
              <legend className="sr-only">Question {n + 1}</legend>
              <p className="text-sm font-medium">{n + 1}. {q.text}</p>
              {q.kind === "short" ? <input className="input" value={a[q.id] ?? ""} disabled={!!res} onChange={(e) => setA({ ...a, [q.id]: e.target.value })} aria-label={`Answer ${n + 1}`} />
                : (q.kind === "mc" ? q.options! : ["True", "False", "Not Given"]).map((o) => <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={q.id} disabled={!!res} checked={a[q.id] === o} onChange={() => setA({ ...a, [q.id]: o })} />{o}</label>)}
              {x && <p className="text-xs">{x.correct ? "✓ Correct. " : `✗ Answer: ${x.answer}. `}<span className="muted">{x.why}</span></p>}
            </fieldset>);
        })}
        {!res && <button className="btn-primary w-full" disabled={pending} onClick={() => start(async () => setRes(await gradeReadingAction(a)))}>Submit answers</button>}
      </div>
    </div>
  );
}

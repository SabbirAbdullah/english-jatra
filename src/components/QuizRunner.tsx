"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { startQuizAction, submitQuizAction } from "@/app/actions/quiz";
import { QUIZ_TYPES, type Question } from "@/lib/quiz";
import { LEVELS, type Category } from "@/lib/types";
import { Notice, Progress } from "./ui";

type Result = Extract<Awaited<ReturnType<typeof submitQuizAction>>, { ok: true }>;

export function QuizRunner({ categories, wordId }: { categories: Category[]; wordId?: string }) {
  const [cfg, setCfg] = useState({ level: "", cat: "", count: 10, type: "mixed", mode: "practice" as "practice" | "timed" });
  const [qs, setQs] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [i, setI] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(""), [note, setNote] = useState("");
  const [left, setLeft] = useState(0);
  const [pending, start] = useTransition();
  const submitting = useRef(false);

  const begin = useCallback((over?: Partial<typeof cfg>) => start(async () => {
    setError(""); setNote(""); setResult(null); submitting.current = false;
    const c = { ...cfg, ...over };
    const r = await startQuizAction({ level: c.level || undefined, cat: c.cat || undefined, count: c.count, type: c.type, wordId });
    if (!r.ok) return setError(r.error);
    setQs(r.questions); setAnswers(r.questions.map(() => null)); setI(0); setNote(r.note ?? ""); setLeft(c.mode === "timed" ? r.questions.length * 30 : 0);
  }), [cfg, wordId]);
  useEffect(() => { if (wordId) begin(); }, [wordId]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    if (!qs || submitting.current) return; submitting.current = true;
    start(async () => {
      const r = await submitQuizAction({ questions: qs, answers, mode: cfg.mode, type: cfg.type });
      if (!r.ok) { submitting.current = false; return setError(r.error); }
      setResult(r); setQs(null);
    });
  }, [qs, answers, cfg.mode, cfg.type]);

  useEffect(() => {
    if (!qs || cfg.mode !== "timed" || result) return;
    if (left <= 0) { if (qs) finish(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000); return () => clearTimeout(t);
  }, [left, qs, cfg.mode, result, finish]);

  if (result) {
    const wrong = result.results.filter((r) => !r.correct);
    return (
      <div className="space-y-4">
        <div className="card text-center"><p className="text-sm muted">Your score</p><p className="text-5xl font-bold">{result.score}/{result.total}</p><p className="text-lg">{result.percent}%</p>
          <div className="mt-3 flex justify-center gap-2"><button className="btn-primary" onClick={() => { setResult(null); begin(); }}>Retry with new questions</button><button className="btn-ghost" onClick={() => setResult(null)}>Change settings</button></div></div>
        {result.signedIn ? (result.saved ? <Notice kind="ok">Result saved to your history.</Notice> : <Notice kind="error">Your result could not be saved. Your score above is still correct.</Notice>) : <Notice kind="info"><Link className="underline" href="/login">Sign in</Link> to save results and track your accuracy.</Notice>}
        {wrong.length > 0 && <div className="card"><h2 className="h2 mb-2">Revise these</h2><div className="flex flex-wrap gap-2">{[...new Map(wrong.map((r) => [r.wordId, r])).values()].map((r) => <Link key={r.wordId} className="btn-ghost" href={`/vocabulary/${r.wordId}`}>{r.word}</Link>)}</div></div>}
        <ol className="space-y-3">{result.results.map((r, k) => (
          <li key={k} className={`card !p-4 ${r.correct ? "border-emerald-300 dark:border-emerald-800" : "border-red-300 dark:border-red-800"}`}>
            <p className="font-medium">{k + 1}. {r.prompt}</p>
            <p className="mt-1 text-sm">Your answer: <span className={`bn ${r.correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{r.selected ?? "— (no answer)"}</span> {r.correct ? "✓" : "✗"}</p>
            {!r.correct && <p className="text-sm">Correct answer: <b className="bn">{r.correctAnswer}</b></p>}
            {r.explanation && <p className="mt-1 text-xs muted bn">{r.explanation}</p>}</li>))}</ol>
      </div>
    );
  }

  if (qs) {
    const q = qs[i], answered = answers.filter(Boolean).length;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between text-sm muted"><span>Question {i + 1} of {qs.length}</span>{cfg.mode === "timed" && <span role="timer" className={left < 15 ? "font-semibold text-red-600" : ""}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>}<span>{answered} answered</span></div>
        <Progress value={i + 1} max={qs.length} />
        {note && <Notice kind="info">{note}</Notice>}
        <fieldset className="card space-y-3"><legend className="sr-only">Question {i + 1}</legend>
          <p className={`text-lg font-medium ${q.type === "bn_to_en" ? "bn" : ""}`}>{q.prompt}</p>
          <div className="grid gap-2">{q.options.map((o) => (
            <label key={o} className={`bn flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${answers[i] === o ? "border-brand-600 bg-brand-50 dark:bg-slate-800" : "border-slate-300 dark:border-slate-700"}`}>
              <input type="radio" name={`q${i}`} checked={answers[i] === o} onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? o : x)))} />{o}</label>))}</div>
        </fieldset>
        <div className="flex justify-between"><button className="btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
          {i < qs.length - 1 ? <button className="btn-primary" onClick={() => setI(i + 1)}>Next →</button> : <button className="btn-primary" disabled={pending} onClick={finish}>{pending ? "Scoring…" : "Submit quiz"}</button>}</div>
        <p className="text-center text-xs muted">Correct answers are shown only after you submit.</p>
      </div>
    );
  }

  const set = (k: string, v: string | number) => setCfg((c) => ({ ...c, [k]: v }));
  return (
    <div className="card mx-auto max-w-xl space-y-4" aria-busy={pending}>
      <h2 className="h2">{wordId ? "Preparing a short quiz on this word…" : "Quiz settings"}</h2>
      {!wordId && (<div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="ql">Level</label><select id="ql" className="input" value={cfg.level} onChange={(e) => set("level", e.target.value)}><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="qc">Category</label><select id="qc" className="input" value={cfg.cat} onChange={(e) => set("cat", e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="qt">Question type</label><select id="qt" className="input" value={cfg.type} onChange={(e) => set("type", e.target.value)}>{QUIZ_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        <div><label className="label" htmlFor="qn">Questions</label><select id="qn" className="input" value={cfg.count} onChange={(e) => set("count", Number(e.target.value))}>{[5, 10, 15, 20, 30].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div className="sm:col-span-2"><span className="label">Mode</span><div className="flex gap-4 text-sm">{(["practice", "timed"] as const).map((m) => <label key={m} className="flex items-center gap-2"><input type="radio" name="mode" checked={cfg.mode === m} onChange={() => set("mode", m)} />{m === "practice" ? "Practice (no timer)" : "Timed (30 s per question)"}</label>)}</div></div>
      </div>)}
      {error && <Notice kind="error">{error}</Notice>}
      {!wordId && <button className="btn-primary w-full" disabled={pending} onClick={() => begin()}>{pending ? "Building quiz…" : "Start quiz"}</button>}
      <p className="text-xs muted">Questions are generated from the vocabulary database, with answer options chosen from other words. Fill-in-the-blank is offered only for words with reviewed example sentences.</p>
    </div>
  );
}

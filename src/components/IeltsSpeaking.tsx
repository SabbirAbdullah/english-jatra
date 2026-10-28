"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SPEAKING } from "@/lib/ielts-content";
import { saveResponseAction } from "@/app/actions/ielts";
import { Notice } from "./ui";

function useCountdown() {
  const [left, setLeft] = useState(0), [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; if (left <= 0) { setRunning(false); return; } const t = setTimeout(() => setLeft((s) => s - 1), 1000); return () => clearTimeout(t); }, [left, running]);
  return { left, running, start: (s: number) => { setLeft(s); setRunning(true); }, stop: () => setRunning(false) };
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function IeltsSpeaking({ suggestions }: { suggestions: { id: string; english_word: string; bengali_meaning: string }[] }) {
  const router = useRouter();
  const [part, setPart] = useState<1 | 2 | 3>(1), [idx, setIdx] = useState(0), [text, setText] = useState(""), [notes, setNotes] = useState<string[]>([]), [msg, setMsg] = useState("");
  const [pending, start] = useTransition(), prep = useCountdown(), talk = useCountdown();
  const [rec, setRec] = useState<"idle" | "recording">("idle"), [audio, setAudio] = useState<string | null>(null), [recErr, setRecErr] = useState("");
  const mr = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]);

  const items = part === 1 ? SPEAKING.part1.flatMap((t) => t.questions.map((q) => ({ q, topic: t.topic }))) : part === 3 ? SPEAKING.part3.flatMap((t) => t.questions.map((q) => ({ q, topic: t.topic }))) : SPEAKING.part2.map((c) => ({ q: c.prompt, topic: "Cue card" }));
  const cur = items[idx % items.length], card = part === 2 ? SPEAKING.part2[idx % SPEAKING.part2.length] : null;
  const reset = () => { setText(""); setNotes([]); setMsg(""); setAudio(null); prep.stop(); talk.stop(); };

  async function record() {
    setRecErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream); chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => { setAudio(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType }))); stream.getTracks().forEach((t) => t.stop()); setRec("idle"); };
      r.start(); mr.current = r; setRec("recording");
    } catch { setRecErr("Microphone access is unavailable or was denied. You can still type your answer."); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex gap-2">{([1, 2, 3] as const).map((p) => <button key={p} className={part === p ? "btn-primary" : "btn-ghost"} onClick={() => { setPart(p); setIdx(0); reset(); }}>Part {p}</button>)}</div>
        <div className="card space-y-3">
          <p className="text-xs uppercase tracking-wide muted">{cur.topic}</p>
          <p className="text-xl font-medium">{cur.q}</p>
          {card && (<>
            <ul className="list-disc pl-5 text-sm"><li className="list-none -ml-5 mb-1">You should say:</li>{card.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-ghost" onClick={() => prep.start(60)}>Start 1-minute preparation</button><span role="timer" className="font-mono">{prep.running || prep.left ? fmt(prep.left) : ""}</span>
              <button className="btn-ghost" onClick={() => talk.start(120)}>Start 2-minute talk</button><span role="timer" className="font-mono">{talk.running || talk.left ? fmt(talk.left) : ""}</span>
            </div></>)}
          <button className="btn-ghost" onClick={() => { setIdx((i) => i + 1); reset(); }}>Next question →</button>
        </div>
        <div className="card space-y-3">
          <h2 className="h2">Your answer</h2>
          <div className="flex flex-wrap items-center gap-2">
            {rec === "idle" ? <button className="btn-ghost" onClick={record}>● Record</button> : <button className="btn-danger" onClick={() => mr.current?.stop()}>■ Stop</button>}
            {audio && <audio controls src={audio} className="h-9" />}
          </div>
          {recErr && <Notice kind="warn">{recErr}</Notice>}
          <p className="text-xs muted">Recordings stay in your browser and are not uploaded or saved.</p>
          <label className="label" htmlFor="sp-text">Type your answer (optional)</label>
          <textarea id="sp-text" className="input min-h-32" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" disabled={pending || !text.trim()} onClick={() => start(async () => {
            const r = await saveResponseAction({ module: "speaking", task: `part${part}`, prompt: cur.q, body: text, status: "submitted", minWords: part === 1 ? 20 : part === 2 ? 120 : 40 });
            if (!r.ok) return r.error === "AUTH" ? router.push("/login?next=/ielts/speaking") : setMsg(r.error);
            setNotes(r.notes); setMsg("Saved."); router.refresh();
          })}>Save &amp; check</button>
          {msg && <p role="status" className="text-sm muted">{msg}</p>}
          {notes.length > 0 && <Notice kind="info"><ul className="list-disc pl-4">{notes.map((n) => <li key={n}>{n}</li>)}</ul><p className="mt-1 text-xs">Basic automatic checks on length, sentence length and repetition. They do not assess pronunciation, fluency or an IELTS band.</p></Notice>}
        </div>
      </div>
      <aside className="card h-fit space-y-2"><h2 className="h2">Words to try using</h2>
        {suggestions.length ? <ul className="space-y-1.5 text-sm">{suggestions.map((w) => <li key={w.id}><b>{w.english_word}</b> <span className="bn muted">{w.bengali_meaning}</span></li>)}</ul> : <p className="text-sm muted">Import vocabulary to see suggestions.</p>}
        <p className="text-xs muted">Taken from your vocabulary library.</p></aside>
    </div>
  );
}

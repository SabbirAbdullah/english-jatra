"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Copy, Volume2 } from "lucide-react";
import { setWordStatusAction, toggleSaveAction } from "@/app/actions/learn";

export function SaveButton({ wordId, saved, compact }: { wordId: string; saved: boolean; compact?: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState("");
  return (
    <>
      <button className="btn-ghost" disabled={pending} aria-pressed={saved} onClick={() => start(async () => {
        const r = await toggleSaveAction(wordId, !saved);
        if (r.error === "AUTH") return router.push("/login?next=" + encodeURIComponent(location.pathname));
        if (!r.ok) return setErr(r.error ?? "Failed"); router.refresh();
      })}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{!compact && (saved ? "Saved" : "Save")}</button>
      {err && <span role="alert" className="text-xs text-red-600">{err}</span>}
    </>
  );
}

const STATUSES = [["known", "Mark as known"], ["learning", "Still learning"], ["difficult", "Difficult"], ["revision", "Add to revision"]] as const;
export function StatusButtons({ wordId, status }: { wordId: string; status: string | null }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      {STATUSES.map(([v, l]) => (
        <button key={v} className={status === v ? "btn-primary" : "btn-ghost"} disabled={pending} aria-pressed={status === v} onClick={() => start(async () => {
          const r = await setWordStatusAction(wordId, v);
          if (r.error === "AUTH") return router.push("/login?next=" + encodeURIComponent(location.pathname));
          setMsg(r.ok ? "" : r.error ?? "Failed"); router.refresh();
        })}>{l}</button>
      ))}
      {msg && <span role="alert" className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button className="btn-ghost !px-2 !py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard unavailable */ } }}><Copy size={13} />{done ? "Copied" : label}</button>;
}

/** Plays licensed audio when the dataset has it; otherwise uses the browser's built-in English voice. */
export function SpeakButton({ text, audioUrl }: { text: string; audioUrl?: string | null }) {
  const play = () => {
    if (audioUrl) { new Audio(audioUrl).play().catch(() => {}); return; }
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  return <button className="btn-ghost" onClick={play} aria-label={`Pronounce ${text}`} title={audioUrl ? "Recorded audio" : "Browser voice (not a recorded pronunciation)"}><Volume2 size={16} /> Listen</button>;
}

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Shuffle } from "lucide-react";
import { reviewCardAction } from "@/app/actions/learn";
import type { Rating } from "@/lib/srs";
import { shuffle } from "@/lib/quiz";
import { CefrBadge, Progress } from "./ui";
import { SpeakButton } from "./WordActions";

export interface Card { id: string; english_word: string; bengali_meaning: string; part_of_speech: string | null; cefr_level: string; example_sentence: string | null; example_translation_bn: string | null }

export function Flashcards({ deck, signedIn }: { deck: Card[]; signedIn: boolean }) {
  const [cards, setCards] = useState(deck);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState<Record<string, Rating>>({});
  const [err, setErr] = useState("");
  const done = i >= cards.length;
  const card = cards[i];

  const go = useCallback((d: number) => { setFlipped(false); setI((x) => Math.max(0, Math.min(cards.length, x + d))); }, [cards.length]);
  const rate = useCallback(async (r: Rating) => {
    if (!card || !flipped) return;
    setRated((m) => ({ ...m, [card.id]: r }));
    if (signedIn) { const res = await reviewCardAction(card.id, r); if (!res.ok) setErr(res.error ?? "Could not save this review."); else setErr(""); }
    go(1);
  }, [card, flipped, signedIn, go]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === " " || e.key === "Enter") { if (!done && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setFlipped((f) => !f); } }
      else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "1") rate("know"); else if (e.key === "2") rate("learning"); else if (e.key === "3") rate("difficult");
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [go, rate, done]);

  const restart = () => { setI(0); setFlipped(false); setRated({}); };
  const counts = Object.values(rated).reduce((m, r) => ({ ...m, [r]: (m[r] ?? 0) + 1 }), {} as Record<string, number>);

  if (!cards.length) return null;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div><div className="mb-1 flex justify-between text-sm muted"><span>Card {Math.min(i + 1, cards.length)} of {cards.length}</span><span>{Object.keys(rated).length} reviewed</span></div><Progress value={i} max={cards.length} /></div>
      {done ? (
        <div className="card space-y-3 text-center"><h2 className="h2">Session complete</h2>
          <p className="text-sm">Know it: <b>{counts.know ?? 0}</b> · Still learning: <b>{counts.learning ?? 0}</b> · Difficult: <b>{counts.difficult ?? 0}</b></p>
          {!signedIn && <p className="text-sm muted"><Link href="/login?next=/flashcards" className="underline">Sign in</Link> next time to save progress and schedule reviews.</p>}
          <div className="flex justify-center gap-2"><button className="btn-primary" onClick={restart}><RotateCcw size={15} /> Restart</button><Link href="/flashcards?source=difficult" className="btn-ghost">Revise difficult words</Link></div></div>
      ) : (
        <>
          <button onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Show English side" : "Show Bengali meaning"} aria-live="polite"
            className="card grid min-h-64 w-full place-items-center text-center transition hover:border-brand-500">
            {!flipped ? (
              <div className="space-y-2"><div className="flex items-center justify-center gap-2"><CefrBadge level={card.cefr_level} />{card.part_of_speech && <span className="text-sm italic muted">{card.part_of_speech}</span>}</div>
                <p className="text-4xl font-bold">{card.english_word}</p><p className="text-xs muted">Click, tap or press Space to flip</p></div>
            ) : (
              <div className="space-y-3"><p className="bn text-3xl font-semibold">{card.bengali_meaning}</p>
                {card.example_sentence && <p className="text-sm muted">{card.example_sentence}</p>}</div>
            )}
          </button>
          <div className="flex justify-center"><SpeakButton text={card.english_word} /></div>
          <div className="grid grid-cols-3 gap-2" aria-label="Rate this card">
            <button className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" disabled={!flipped} onClick={() => rate("know")}>Know it <kbd className="opacity-70">1</kbd></button>
            <button className="btn-primary !bg-amber-600 hover:!bg-amber-700" disabled={!flipped} onClick={() => rate("learning")}>Still learning <kbd className="opacity-70">2</kbd></button>
            <button className="btn-primary !bg-red-600 hover:!bg-red-700" disabled={!flipped} onClick={() => rate("difficult")}>Difficult <kbd className="opacity-70">3</kbd></button>
          </div>
          {!flipped && <p className="text-center text-xs muted">Flip the card to rate it. Looking at a card does not mark it as learned.</p>}
          <div className="flex justify-between"><button className="btn-ghost" onClick={() => go(-1)} disabled={i === 0}>← Previous</button>
            <div className="flex gap-2"><button className="btn-ghost" onClick={() => { setCards(shuffle(cards)); restart(); }}><Shuffle size={15} /> Shuffle</button><button className="btn-ghost" onClick={restart}><RotateCcw size={15} /> Restart</button></div>
            <button className="btn-ghost" onClick={() => go(1)}>Skip →</button></div>
        </>
      )}
      {err && <p role="alert" className="text-center text-sm text-red-600">{err}</p>}
      <p className="text-center text-xs muted">Keyboard: Space = flip · ← → = navigate · 1 / 2 / 3 = rate</p>
    </div>
  );
}

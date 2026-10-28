import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { LEVELS } from "@/lib/types";
import { Flashcards, type Card } from "@/components/Flashcards";
import { Empty, Notice } from "@/components/ui";

export const metadata = { title: "Flashcards" };
const F = "id,english_word,bengali_meaning,part_of_speech,cefr_level,example_sentence,example_translation_bn";
const SOURCES = [["all", "All words"], ["due", "Due for review"], ["difficult", "Difficult"], ["saved", "Saved"]] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ source?: string; level?: string; cat?: string }> }) {
  const sp = await searchParams;
  const source = SOURCES.some(([v]) => v === sp.source) ? sp.source! : "all";
  const { sb, user } = await getUser();
  const cats = await getCategories(sb);
  let deck: Card[] = [];
  const needsLogin = source !== "all" && !user;

  if (!needsLogin) {
    const nested = (r: any[] | null) => (r ?? []).map((x) => x.vocabulary_words).filter(Boolean) as Card[];
    const filt = (c: Card & { category_id?: string }) => (!sp.level || c.cefr_level === sp.level) && (!sp.cat || c.category_id === sp.cat);
    if (source === "due" && user) deck = nested((await sb.from("user_word_progress").select(`vocabulary_words(${F},category_id)`).eq("user_id", user.id).lte("next_review_at", new Date().toISOString()).order("next_review_at").limit(100)).data).filter(filt).slice(0, 40);
    else if (source === "difficult" && user) deck = nested((await sb.from("user_word_progress").select(`vocabulary_words(${F},category_id)`).eq("user_id", user.id).eq("status", "difficult").limit(100)).data).filter(filt).slice(0, 40);
    else if (source === "saved" && user) deck = nested((await sb.from("saved_words").select(`vocabulary_words(${F},category_id)`).eq("user_id", user.id).limit(100)).data).filter(filt).slice(0, 40);
    else {
      let q = sb.from("vocabulary_words").select(F).eq("status", "published").order("normalized_word").limit(300);
      if (sp.level) q = q.eq("cefr_level", sp.level); if (sp.cat) q = q.eq("category_id", sp.cat);
      let rows = ((await q).data ?? []) as Card[];
      if (user) { const known = new Set(((await sb.from("user_word_progress").select("word_id").eq("user_id", user.id).eq("status", "known")).data ?? []).map((k) => k.word_id)); rows = rows.filter((r) => !known.has(r.id)); }
      deck = rows.sort(() => Math.random() - 0.5).slice(0, 30);
    }
  }
  const key = `${source}-${sp.level}-${sp.cat}`;
  return (
    <div className="space-y-4">
      <h1 className="h1">Flashcards</h1>
      <form className="card grid gap-3 sm:grid-cols-4" method="get">
        <div><label className="label" htmlFor="source">Deck</label><select id="source" name="source" defaultValue={source} className="input">{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="level">Level</label><select id="level" name="level" defaultValue={sp.level ?? ""} className="input"><option value="">All</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="cat">Topic</label><select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">All</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="flex items-end"><button className="btn-primary w-full">Start session</button></div>
      </form>
      {!user && <Notice kind="info">Guest mode: you can practise, but ratings are not saved. <Link className="underline" href="/login?next=/flashcards">Sign in</Link> to schedule reviews.</Notice>}
      {needsLogin ? <Empty title="Sign in to use this deck">Saved, due and difficult decks are tied to your account.</Empty>
        : deck.length === 0 ? <Empty title="No cards in this deck">{source === "due" ? "Nothing is due right now. Come back later or study the full deck." : source === "difficult" ? "You have no difficult words yet." : "Try different filters."}</Empty>
        : <Flashcards key={key} deck={deck} signedIn={!!user} />}
    </div>
  );
}

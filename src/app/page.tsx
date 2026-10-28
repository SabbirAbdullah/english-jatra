import Link from "next/link";
import { BookOpen, GraduationCap, Layers, ListChecks, Target } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getUserStats } from "@/lib/data";
import { LEVELS } from "@/lib/types";
import { BarChart, CefrBadge, Empty, Progress, Stat } from "@/components/ui";

const ACTIONS = [
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen }, { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/quiz", label: "Quizzes", icon: ListChecks }, { href: "/ielts", label: "IELTS Practice", icon: GraduationCap }, { href: "/my", label: "My Learning", icon: Target },
];

export default async function Dashboard() {
  const { sb, user } = await getUser();
  const [{ count: total }, levels] = await Promise.all([
    sb.from("vocabulary_words").select("id", { count: "exact", head: true }).eq("status", "published"),
    sb.from("vocabulary_words").select("cefr_level").eq("status", "published").limit(5000),
  ]);
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<string, number>;
  (levels.data ?? []).forEach((r) => { if (r.cefr_level in byLevel) byLevel[r.cefr_level]++; });

  const quick = (<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{ACTIONS.map((a) => (
    <Link key={a.href} href={a.href} className="card flex flex-col items-center gap-2 !p-4 text-sm font-medium hover:border-brand-500"><a.icon size={22} className="text-brand-600" aria-hidden />{a.label}</Link>))}</div>);

  if (!user) return (
    <div className="space-y-6">
      <section className="card"><h1 className="h1">Learn English vocabulary with Bengali meanings</h1>
        <p className="muted mt-2 max-w-2xl text-sm">Browse {total ?? 0} words with meanings, collocations, synonyms and examples. Create a free account to save words, practise with spaced-repetition flashcards, take quizzes and track your progress.</p>
        <div className="mt-4 flex gap-2"><Link href="/register" className="btn-primary">Create free account</Link><Link href="/vocabulary" className="btn-ghost">Browse vocabulary</Link></div></section>
      {quick}
      <section className="grid gap-4 sm:grid-cols-2"><div className="card"><h2 className="h2 mb-3">Words by level</h2><BarChart label="Words by CEFR level" data={LEVELS.map((l) => ({ label: l, value: byLevel[l] }))} /></div>
        <div className="card text-sm"><h2 className="h2 mb-2">Guest vs account</h2><p><b>Without an account:</b> browse and search words, try quizzes and flashcards.</p><p className="mt-2"><b>With an account:</b> saved words, spaced-repetition progress, quiz history, streaks, IELTS drafts and personal sentences.</p></div></section>
    </div>
  );

  const s = await getUserStats(sb, user.id);
  const goal = s.profile?.daily_word_goal ?? 10, target = s.profile?.target_cefr ?? null;
  const known = new Set(s.progress.map((p) => p.word_id));
  const [recent, rec] = await Promise.all([
    sb.from("user_word_progress").select("status,last_reviewed_at,vocabulary_words(id,english_word,bengali_meaning)").eq("user_id", user.id).not("last_reviewed_at", "is", null).order("last_reviewed_at", { ascending: false }).limit(8),
    (target ? sb.from("vocabulary_words").select("id,english_word,bengali_meaning,cefr_level").eq("status", "published").eq("cefr_level", target) : sb.from("vocabulary_words").select("id,english_word,bengali_meaning,cefr_level").eq("status", "published")).order("normalized_word").limit(60),
  ]);
  const recommended = (rec.data ?? []).filter((w) => !known.has(w.id)).slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="card"><h1 className="h1">Welcome back{s.profile?.display_name ? `, ${s.profile.display_name}` : ""}</h1>
        <div className="mt-3 max-w-md"><div className="mb-1 flex justify-between text-sm"><span>Today's goal</span><span className="muted">{s.reviewedToday} / {goal} words</span></div><Progress value={s.reviewedToday} max={goal} /></div></section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Reviewed today" value={s.reviewedToday} /><Stat label="Total words" value={total ?? 0} /><Stat label="Known" value={s.known} />
        <Stat label="Saved" value={s.saved} hint={`${s.due} due for review`} /><Stat label="Quiz accuracy" value={s.accuracy === null ? "—" : `${s.accuracy}%`} /><Stat label="Streak" value={`${s.streak} day${s.streak === 1 ? "" : "s"}`} />
      </div>
      {quick}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card"><h2 className="h2 mb-3">Recent quiz scores</h2>
          {s.recentScores.length ? <ul className="space-y-2 text-sm">{s.recentScores.map((a) => <li key={a.id} className="flex justify-between"><span className="muted">{new Date(a.started_at).toLocaleDateString()} · {a.quiz_type}</span><b>{a.correct}/{a.total}</b></li>)}</ul> : <p className="muted text-sm">No quizzes yet. <Link className="underline" href="/quiz">Take one</Link>.</p>}</section>
        <section className="card"><h2 className="h2 mb-3">Recent activity</h2>
          {recent.data?.length ? <ul className="space-y-2 text-sm">{recent.data.map((r: any, i) => <li key={i} className="flex justify-between gap-2"><Link className="underline" href={`/vocabulary/${r.vocabulary_words?.id}`}>{r.vocabulary_words?.english_word}</Link><span className="muted">{r.status}</span></li>)}</ul> : <p className="muted text-sm">Review flashcards to see activity here.</p>}</section>
        <section className="card"><h2 className="h2 mb-3">Recommended{target ? ` (${target})` : ""}</h2>
          {recommended.length ? <ul className="space-y-2 text-sm">{recommended.map((w) => <li key={w.id} className="flex items-center justify-between gap-2"><Link className="underline" href={`/vocabulary/${w.id}`}>{w.english_word} <span className="bn muted">{w.bengali_meaning}</span></Link><CefrBadge level={w.cefr_level} /></li>)}</ul> : <Empty title="Nothing new to recommend" />}
          {!target && <p className="muted mt-3 text-xs">Set a target level in <Link className="underline" href="/settings">Settings</Link> for level-matched suggestions.</p>}</section>
      </div>
    </div>
  );
}

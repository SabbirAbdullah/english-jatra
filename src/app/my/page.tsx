import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getUserStats } from "@/lib/data";
import { LEVELS } from "@/lib/types";
import { BarChart, CefrBadge, Empty, Progress, Stat } from "@/components/ui";
import { SaveButton } from "@/components/WordActions";

export const metadata = { title: "My Learning" };
const TABS = [["overview", "Overview"], ["saved", "Saved"], ["learned", "Learned"], ["difficult", "Difficult"], ["due", "Due"], ["quizzes", "Quiz history"]] as const;
const F = "id,english_word,bengali_meaning,cefr_level";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([t]) => t === sp.tab) ? sp.tab! : "overview";
  const { sb, user } = await getUser();
  if (!user) return null;   // middleware redirects guests
  const s = await getUserStats(sb, user.id);
  const nested = (r: any[] | null) => (r ?? []).map((x) => x.vocabulary_words).filter(Boolean) as { id: string; english_word: string; bengali_meaning: string; cefr_level: string }[];
  let words: ReturnType<typeof nested> | null = null;
  if (tab === "saved") words = nested((await sb.from("saved_words").select(`vocabulary_words(${F})`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(200)).data);
  if (tab === "learned") words = nested((await sb.from("user_word_progress").select(`vocabulary_words(${F})`).eq("user_id", user.id).eq("status", "known").limit(200)).data);
  if (tab === "difficult") words = nested((await sb.from("user_word_progress").select(`vocabulary_words(${F})`).eq("user_id", user.id).eq("status", "difficult").limit(200)).data);
  if (tab === "due") words = nested((await sb.from("user_word_progress").select(`vocabulary_words(${F})`).eq("user_id", user.id).lte("next_review_at", new Date().toISOString()).order("next_review_at").limit(200)).data);

  let overview: React.ReactNode = null;
  if (tab === "overview") {
    const { data: all } = await sb.from("vocabulary_words").select("id,cefr_level").eq("status", "published").limit(5000);
    const known = new Set(s.progress.filter((p) => p.status === "known").map((p) => p.word_id));
    const lv = LEVELS.map((l) => { const ids = (all ?? []).filter((w) => w.cefr_level === l); return { l, total: ids.length, known: ids.filter((w) => known.has(w.id)).length }; });
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (13 - i)); return d.toISOString().slice(0, 10); });
    const byDay = (dates: (string | null)[]) => (d: string) => dates.filter((x) => x && x.slice(0, 10) === d).length;
    const rv = byDay(s.progress.map((p) => p.last_reviewed_at)), qz = byDay(s.attempts.map((a) => a.started_at));
    const since = (n: number) => { const t = Date.now() - n * 86_400_000; return s.progress.filter((p) => p.last_reviewed_at && +new Date(p.last_reviewed_at) >= t).length; };
    const sinceQ = (n: number) => s.attempts.filter((a) => +new Date(a.started_at) >= Date.now() - n * 86_400_000).length;
    const types = [...new Set(s.attempts.map((a) => a.quiz_type))].map((t) => { const a = s.attempts.filter((x) => x.quiz_type === t); const c = a.reduce((m, x) => m + x.correct, 0), n = a.reduce((m, x) => m + x.total, 0); return { t, pct: Math.round((c / n) * 100), n }; });
    overview = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Words reviewed (7 days)" value={since(7)} hint={`${since(30)} in 30 days`} /><Stat label="Quizzes (7 days)" value={sinceQ(7)} hint={`${sinceQ(30)} in 30 days`} /><Stat label="Streak" value={`${s.streak} d`} /><Stat label="Quiz accuracy" value={s.accuracy === null ? "—" : `${s.accuracy}%`} /></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card"><h2 className="h2 mb-3">Activity, last 14 days</h2><BarChart label="Reviews plus quizzes per day" data={days.map((d) => ({ label: d.slice(8), value: rv(d) + qz(d) }))} /><p className="mt-2 text-xs muted">Days are counted in UTC.</p></section>
          <section className="card"><h2 className="h2 mb-3">Known words by level</h2><div className="space-y-2.5">{lv.map((x) => <div key={x.l}><div className="mb-0.5 flex justify-between text-xs"><span>{x.l}</span><span className="muted">{x.known} / {x.total}</span></div><Progress value={x.known} max={x.total} /></div>)}</div></section>
          <section className="card"><h2 className="h2 mb-3">Accuracy by quiz type</h2>{types.length ? <ul className="space-y-2 text-sm">{types.map((x) => <li key={x.t} className="flex justify-between"><span>{x.t}</span><b>{x.pct}% <span className="font-normal muted">({x.n} questions)</span></b></li>)}</ul> : <p className="text-sm muted">Take a quiz to see accuracy by type.</p>}</section>
          <section className="card"><h2 className="h2 mb-3">Goals</h2><p className="text-sm">Daily target: <b>{s.profile?.daily_word_goal ?? 10}</b> words · Target level: <b>{s.profile?.target_cefr ?? "not set"}</b></p><Link href="/settings" className="btn-ghost mt-3">Edit goals</Link></section>
        </div></div>);
  }

  return (
    <div className="space-y-4">
      <h1 className="h1">My Learning</h1>
      <nav aria-label="Sections" className="flex flex-wrap gap-2">{TABS.map(([t, l]) => <Link key={t} href={`/my?tab=${t}`} aria-current={t === tab ? "page" : undefined} className={t === tab ? "btn-primary" : "btn-ghost"}>{l}</Link>)}</nav>
      {overview}
      {words && (words.length ? <ul className="grid gap-2">{words.map((w) => <li key={w.id} className="card flex items-center justify-between gap-3 !p-3"><Link href={`/vocabulary/${w.id}`} className="flex flex-wrap items-center gap-2"><b>{w.english_word}</b><span className="bn muted">{w.bengali_meaning}</span><CefrBadge level={w.cefr_level} /></Link>{tab === "saved" && <SaveButton wordId={w.id} saved compact />}</li>)}</ul>
        : <Empty title={`No ${tab} words yet`}>{tab === "due" ? "Nothing is due for review right now." : "They will appear here as you study."}</Empty>)}
      {tab === "quizzes" && (s.attempts.length ? <div className="card overflow-x-auto !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="p-3">Date</th><th>Type</th><th>Mode</th><th>Score</th></tr></thead><tbody>{s.attempts.slice(0, 50).map((a) => <tr key={a.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3">{new Date(a.started_at).toLocaleString()}</td><td>{a.quiz_type}</td><td>{a.mode}</td><td><b>{a.correct}/{a.total}</b> ({Math.round((a.correct / a.total) * 100)}%)</td></tr>)}</tbody></table></div> : <Empty title="No quizzes yet"><Link className="underline" href="/quiz">Take your first quiz</Link></Empty>)}
    </div>
  );
}

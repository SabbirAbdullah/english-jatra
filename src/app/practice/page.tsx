import Link from "next/link";
import { getUser } from "@/lib/auth";
import { DIALOGUES, MISTAKES, PATTERNS, TOPICS } from "@/lib/spoken-content";
import { SentenceExercise } from "@/components/SentenceExercise";
import { MySentences } from "@/components/MySentences";

export const metadata = { title: "Spoken English" };
export default async function Page() {
  const { sb, user } = await getUser();
  const { data } = user ? await sb.from("practice_sentences").select("id,sentence,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100) : { data: [] };
  return (
    <div className="space-y-8">
      <div><h1 className="h1">Spoken English &amp; sentence practice</h1><p className="muted mt-1 text-sm">Everyday phrases, useful patterns and common mistakes, with Bengali explanations.</p></div>

      <section className="space-y-3"><h2 className="h2">Useful sentence patterns</h2>
        <div className="grid gap-3 sm:grid-cols-2">{PATTERNS.map((p) => <div key={p.en} className="card !p-4"><p className="font-semibold">{p.en}</p><p className="bn mt-1 text-sm">{p.bn}</p><p className="mt-2 text-sm italic">{p.ex}</p></div>)}</div></section>

      <section className="space-y-3"><h2 className="h2">Common mistakes</h2>
        <div className="card overflow-x-auto !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="p-3">Instead of</th><th>Say</th><th>Why (বাংলায়)</th></tr></thead><tbody>{MISTAKES.map((m) => <tr key={m.wrong} className="border-t border-slate-200 align-top dark:border-slate-800"><td className="p-3 text-red-700 dark:text-red-300">{m.wrong}</td><td className="text-emerald-700 dark:text-emerald-300">{m.right}</td><td className="bn">{m.bn}</td></tr>)}</tbody></table></div></section>

      <section className="space-y-3"><h2 className="h2">Everyday conversation: questions &amp; answers</h2>
        <div className="grid gap-3 sm:grid-cols-2">{TOPICS.map((t) => <details key={t.topic} className="card !p-4"><summary className="cursor-pointer font-medium">{t.topic}</summary><dl className="mt-3 space-y-3 text-sm">{t.qa.map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd className="muted">{a}</dd></div>)}</dl></details>)}</div></section>

      <section className="space-y-3"><h2 className="h2">Situational dialogues</h2>
        <div className="grid gap-3 sm:grid-cols-3">{DIALOGUES.map((d) => <div key={d.title} className="card !p-4 text-sm"><p className="mb-2 font-semibold">{d.title}</p>{d.lines.map(([who, line], i) => <p key={i}><b>{who}:</b> {line}</p>)}</div>)}</div></section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3"><h2 className="h2">Check or save a sentence</h2><SentenceExercise />{!user && <p className="text-xs muted"><Link className="underline" href="/login?next=/practice">Sign in</Link> to save sentences.</p>}</div>
        <div className="card space-y-3"><h2 className="h2">My sentences</h2>{user ? <MySentences items={data ?? []} /> : <p className="text-sm muted">Sign in to build your own collection.</p>}</div>
      </section>
    </div>
  );
}

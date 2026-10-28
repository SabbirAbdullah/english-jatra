import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { adjacentWords, getWord, relatedWords } from "@/lib/data";
import { CopyButton, SaveButton, SpeakButton, StatusButtons } from "@/components/WordActions";
import { SentenceExercise } from "@/components/SentenceExercise";
import { CefrBadge, Chips, Notice } from "@/components/ui";

const REVIEW = ["TEMPLATED_EXAMPLE", "ARTICLE_AGREEMENT", "AWKWARD_BENGALI_TRANSLATION"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const w = await getWord(await createClient(), (await params).id);
  return { title: w?.english_word ?? "Word" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const w = await getWord(sb, (await params).id);
  if (!w) notFound();
  const { user } = await getUser();
  const [{ prev, next }, related] = await Promise.all([adjacentWords(sb, w), relatedWords(sb, w)]);
  let saved = false, status: string | null = null;
  if (user) {
    const [a, b] = await Promise.all([sb.from("saved_words").select("word_id").eq("user_id", user.id).eq("word_id", w.id).maybeSingle(), sb.from("user_word_progress").select("status").eq("user_id", user.id).eq("word_id", w.id).maybeSingle()]);
    saved = !!a.data; status = b.data?.status ?? null;
  }
  const underReview = w.review_flags.some((f) => REVIEW.includes(f));
  const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (<section><h2 className="mb-1.5 text-sm font-semibold uppercase tracking-wide muted">{title}</h2>{children}</section>);

  return (
    <div className="space-y-5">
      <Link href="/vocabulary" className="text-sm muted underline">← All vocabulary</Link>
      <header className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{w.english_word}</h1>
          {w.part_of_speech && <span className="italic muted">{w.part_of_speech}</span>}<CefrBadge level={w.cefr_level} provisional={w.cefr_status === "provisional"} />
          {w.categories?.name && <span className="badge bg-slate-100 dark:bg-slate-800">{w.categories.name}</span>}</div>
        {w.pronunciation && <p className="muted">/{w.pronunciation.replace(/^\/|\/$/g, "")}/</p>}
        <p className="bn text-2xl">{w.bengali_meaning}</p>
        <div className="flex flex-wrap gap-2"><SpeakButton text={w.english_word} audioUrl={w.audio_url} /><SaveButton wordId={w.id} saved={saved} /><Link className="btn-ghost" href={`/quiz?word=${w.id}`}>Quiz this word</Link></div>
        <StatusButtons wordId={w.id} status={status} />
        {!user && <p className="text-xs muted"><Link className="underline" href={`/login?next=/vocabulary/${w.id}`}>Sign in</Link> to save this word and track your progress.</p>}
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card space-y-5">
            {w.example_sentence ? (
              <Row title="Example">
                <p className="text-lg">{w.example_sentence}</p>
                {w.example_translation_bn && <p className="bn muted">{w.example_translation_bn}</p>}
                <div className="mt-2 flex gap-2"><CopyButton text={w.example_sentence} label="Copy sentence" /></div>
                {underReview && <div className="mt-2"><Notice kind="warn">This example is auto-generated and still under editorial review; it may sound unnatural.</Notice></div>}
              </Row>) : <p className="text-sm muted">No example sentence is available for this word yet.</p>}
            {w.collocations.length > 0 && <Row title="Collocations"><Chips items={w.collocations} /></Row>}
            {w.word_forms.length > 0 && <Row title="Word forms"><Chips items={w.word_forms} link /></Row>}
          </div>
          <div className="card space-y-3"><h2 className="h2">Practice: write your own sentence</h2><SentenceExercise wordId={w.id} word={w.english_word} prompt={w.practice_sentence} /></div>
        </div>
        <aside className="space-y-5">
          <div className="card space-y-4">
            <Row title="Synonyms">{w.synonyms.length ? <Chips items={w.synonyms} link /> : <p className="text-sm muted">None listed.</p>}</Row>
            <Row title="Antonyms">{w.antonyms.length ? <Chips items={w.antonyms} link /> : <p className="text-sm muted">None listed.</p>}</Row>
            {related.length > 0 && <Row title="Related words"><ul className="space-y-1 text-sm">{related.map((r) => <li key={r.id}><Link className="underline" href={`/vocabulary/${r.id}`}>{r.english_word}</Link> <span className="bn muted">{r.bengali_meaning}</span></li>)}</ul></Row>}
          </div>
          <details className="card text-sm"><summary className="cursor-pointer font-medium">Study data &amp; source</summary>
            <dl className="mt-3 space-y-2">
              {w.flashcard_front && <div><dt className="muted">Flashcard</dt><dd>{w.flashcard_front} → <span className="bn">{w.flashcard_back}</span></dd></div>}
              {w.quiz_question && <div><dt className="muted">Stored quiz question</dt><dd>{w.quiz_question}</dd>{!w.quiz_verified && <dd className="mt-1 text-xs text-amber-700 dark:text-amber-300">Stored options are unreviewed placeholders; quizzes generate their own options.</dd>}</div>}
              <div><dt className="muted">Source</dt><dd>{[w.source_name, w.source_note].filter(Boolean).join(" · ") || "Not recorded"}{w.source_url && <> · <a className="underline" href={w.source_url} rel="noreferrer noopener" target="_blank">link</a></>}</dd></div>
              {w.license_name && <div><dt className="muted">License</dt><dd>{w.license_name}</dd></div>}{w.attribution_text && <div><dt className="muted">Attribution</dt><dd>{w.attribution_text}</dd></div>}
              <div><dt className="muted">Added</dt><dd>{new Date(w.created_at).toLocaleDateString()}{w.import_batch ? ` · ${w.import_batch}` : ""}</dd></div>
              {w.cefr_status === "provisional" && <div className="text-xs muted">CEFR level is provisional (not verified against an official list).</div>}
            </dl></details>
        </aside>
      </div>
      <nav className="flex justify-between text-sm" aria-label="Word navigation">
        {prev ? <Link className="btn-ghost" href={`/vocabulary/${prev.id}`}>← {prev.english_word}</Link> : <span />}
        {next ? <Link className="btn-ghost" href={`/vocabulary/${next.id}`}>{next.english_word} →</Link> : <span />}
      </nav>
    </div>
  );
}

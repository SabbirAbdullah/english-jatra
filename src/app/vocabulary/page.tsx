import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getCategories, searchWords } from "@/lib/data";
import { Filters } from "@/components/Filters";
import { SaveButton } from "@/components/WordActions";
import { CefrBadge, Empty, Pagination } from "@/components/ui";

export const metadata = { title: "Vocabulary" };
type SP = { q?: string; level?: string; pos?: string; cat?: string; sort?: string; page?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const { user } = await getUser();
  const [{ rows, total, page, size }, cats] = await Promise.all([searchWords(sb, { ...sp, page: Number(sp.page) || 1 }), getCategories(sb)]);
  let saved = new Set<string>(), status = new Map<string, string>();
  if (user && rows.length) {
    const ids = rows.map((r) => r.id);
    const [a, b] = await Promise.all([sb.from("saved_words").select("word_id").eq("user_id", user.id).in("word_id", ids), sb.from("user_word_progress").select("word_id,status").eq("user_id", user.id).in("word_id", ids)]);
    saved = new Set((a.data ?? []).map((x) => x.word_id)); status = new Map((b.data ?? []).map((x) => [x.word_id, x.status]));
  }
  return (
    <div className="space-y-4">
      <h1 className="h1">Vocabulary</h1>
      <Filters categories={cats} />
      {rows.length === 0 ? <Empty title="No words match your search">Try a different spelling, clear a filter, or search in Bengali.</Empty> : (
        <ul className="grid gap-3">{rows.map((w) => (
          <li key={w.id} className="card flex items-start justify-between gap-3 !p-4">
            <Link href={`/vocabulary/${w.id}`} className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold">{w.english_word}</span>{w.part_of_speech && <span className="text-sm italic muted">{w.part_of_speech}</span>}<CefrBadge level={w.cefr_level} provisional={w.cefr_status === "provisional"} />{status.get(w.id) && <span className="badge bg-slate-100 dark:bg-slate-800">{status.get(w.id)}</span>}</div>
              <p className="bn mt-0.5">{w.bengali_meaning}</p>
              {w.categories?.name && <p className="mt-1 text-xs muted">{w.categories.name}</p>}
            </Link>
            <SaveButton wordId={w.id} saved={saved.has(w.id)} compact />
          </li>))}</ul>)}
      <Pagination page={page} total={total} size={size} base="/vocabulary" params={sp} />
      <p className="text-xs muted">* Levels marked with an asterisk are provisional and not yet verified against an official CEFR list.</p>
    </div>
  );
}

import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getCategories, searchWords } from "@/lib/data";
import { Filters } from "@/components/Filters";
import { ConfirmDelete } from "@/components/AdminWordForm";
import { CefrBadge, Empty, Pagination } from "@/components/ui";

type SP = { q?: string; level?: string; pos?: string; cat?: string; sort?: string; page?: string; flagged?: string };
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sb } = await getUser();
  const [{ rows, total, page, size }, cats] = await Promise.all([searchWords(sb, { ...sp, page: Number(sp.page) || 1, pageSize: 25, includeDrafts: true, flagged: sp.flagged === "1" }), getCategories(sb)]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="h1">Words ({total})</h1><Link href="/admin/words/new" className="btn-primary">New word</Link></div>
      <Filters categories={cats} admin />
      {rows.length === 0 ? <Empty title="No matching records" /> : (
        <div className="card overflow-x-auto !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="p-3">Word</th><th>Bengali</th><th>POS</th><th>Level</th><th>Status</th><th>Flags</th><th /></tr></thead>
          <tbody>{rows.map((w) => (
            <tr key={w.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3 font-medium">{w.english_word}</td><td className="bn">{w.bengali_meaning}</td><td>{w.part_of_speech}</td><td><CefrBadge level={w.cefr_level} provisional={w.cefr_status === "provisional"} /></td><td>{w.status}</td>
              <td className="max-w-[14rem] truncate text-xs" title={w.review_flags.join(", ")}>{w.review_flags.length || ""}</td>
              <td className="whitespace-nowrap p-2 text-right"><Link className="btn-ghost !py-1" href={`/admin/words/${w.id}`}>Edit</Link> <ConfirmDelete id={w.id} word={w.english_word} /></td></tr>))}</tbody></table></div>)}
      <Pagination page={page} total={total} size={size} base="/admin/words" params={sp} />
    </div>
  );
}

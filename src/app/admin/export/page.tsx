import { getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { LEVELS } from "@/lib/types";
export default async function Page() {
  const { sb } = await getUser();
  const cats = await getCategories(sb);
  const { data } = await sb.from("vocabulary_words").select("import_batch").limit(20000);
  const batches = [...new Set((data ?? []).map((r) => r.import_batch).filter(Boolean))] as string[];
  return (
    <div className="space-y-4"><h1 className="h1">Export vocabulary</h1>
      <form action="/api/admin/export" method="get" className="card grid gap-3 sm:grid-cols-4">
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" className="input" /></div>
        <div><label className="label" htmlFor="level">Level</label><select id="level" name="level" className="input"><option value="">All</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="cat">Category</label><select id="cat" name="cat" className="input"><option value="">All</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="batch">Batch</label><select id="batch" name="batch" className="input"><option value="">All</option>{batches.map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="sm:col-span-4"><button className="btn-primary">Download CSV</button><p className="mt-2 text-xs muted">UTF-8 with BOM (opens correctly in Excel with Bengali text). Cells starting with = + - @ are prefixed with an apostrophe to prevent spreadsheet formula injection. The export uses the same columns as the import template, so it can be re-imported.</p></div>
      </form></div>
  );
}

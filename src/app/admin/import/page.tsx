import { getUser } from "@/lib/auth";
import { FIELDS } from "@/lib/csv/schema";
import { ImportWizard } from "@/components/ImportWizard";

export const metadata = { title: "Import CSV" };
export default async function Page() {
  const { sb } = await getUser();
  const { data } = await sb.from("import_jobs").select("batch_name").order("created_at", { ascending: false }).limit(200);
  const nums = (data ?? []).map((j) => Number(/(\d+)$/.exec(j.batch_name)?.[1])).filter(Boolean);
  const suggested = `batch_${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
  return (
    <div className="space-y-5">
      <h1 className="h1">Import vocabulary CSV</h1>
      <div className="card flex flex-wrap items-center gap-3 text-sm"><a className="btn-primary" href="/api/admin/template" download>Download blank template</a><span className="muted">Use the template header row for new batches. Files from the first batch (<code>id</code>, <code>english_example</code>…) also map automatically.</span></div>
      <ImportWizard suggestedBatch={suggested} />
      <details className="card text-sm"><summary className="cursor-pointer font-medium">Schema guide: columns, required fields and formats</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full"><thead className="text-left text-xs uppercase muted"><tr><th className="p-2">Column</th><th>Required</th><th>Description</th><th>Also accepted as</th></tr></thead>
          <tbody>{FIELDS.map((f) => <tr key={f.name} className="border-t border-slate-200 dark:border-slate-800"><td className="p-2 font-mono text-xs">{f.name}</td><td>{f.required ? "Yes" : "No"}</td><td>{f.description}</td><td className="font-mono text-xs">{f.aliases.filter((a) => a !== f.name).join(", ")}</td></tr>)}</tbody></table></div>
        <p className="mt-3 muted">Lists use <code>;</code> as the separator. If a single value itself contains <code>;</code>, wrap the whole cell in quotes. Duplicate identity is the lower-cased word plus its part of speech, checked against every earlier batch.</p></details>
    </div>
  );
}

import { getUser } from "@/lib/auth";
import { Empty } from "@/components/ui";
export default async function Page() {
  const { sb } = await getUser();
  const { data } = await sb.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="space-y-4"><h1 className="h1">Import history</h1>
      {!data?.length ? <Empty title="No imports yet" /> : <div className="card overflow-x-auto !p-0"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="p-3">When</th><th>Batch</th><th>File</th><th>Mode</th><th>Status</th><th>Imported</th><th>Updated</th><th>Skipped</th><th>Rejected</th><th /></tr></thead>
        <tbody>{data.map((j) => <tr key={j.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3">{new Date(j.created_at).toLocaleString()}</td><td>{j.batch_name}</td><td className="max-w-[12rem] truncate">{j.file_name}</td><td>{j.duplicate_mode}</td><td>{j.status}</td><td>{j.rows_imported}</td><td>{j.rows_updated}</td><td>{j.rows_skipped}</td><td>{j.rows_rejected}</td><td><a className="underline" href={`/api/admin/imports/${j.id}/errors`}>Issues CSV</a></td></tr>)}</tbody></table></div>}</div>
  );
}

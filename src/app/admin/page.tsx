import Link from "next/link";
import { getUser } from "@/lib/auth";
import { LEVELS } from "@/lib/types";
import { BarChart, Stat } from "@/components/ui";

export default async function Page() {
  const { sb } = await getUser();
  const [all, drafts, jobs] = await Promise.all([
    sb.from("vocabulary_words").select("cefr_level,review_flags,cefr_status,quiz_verified,import_batch").limit(20000),
    sb.from("vocabulary_words").select("id", { count: "exact", head: true }).eq("status", "draft"),
    sb.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(1),
  ]);
  const rows = all.data ?? [];
  const flags: Record<string, number> = {};
  rows.forEach((r) => r.review_flags.forEach((f: string) => (flags[f] = (flags[f] ?? 0) + 1)));
  const job = jobs.data?.[0];
  return (
    <div className="space-y-4">
      <h1 className="h1">Admin overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vocabulary records" value={rows.length} /><Stat label="Drafts" value={drafts.count ?? 0} />
        <Stat label="With review flags" value={rows.filter((r) => r.review_flags.length).length} /><Stat label="Provisional CEFR" value={rows.filter((r) => r.cefr_status === "provisional").length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="h2 mb-3">Records by level</h2><BarChart label="Records by CEFR level" data={LEVELS.map((l) => ({ label: l, value: rows.filter((r) => r.cefr_level === l).length }))} /></section>
        <section className="card"><h2 className="h2 mb-3">Data-quality warnings</h2>
          {Object.keys(flags).length ? <ul className="space-y-1.5 text-sm">{Object.entries(flags).sort((a, b) => b[1] - a[1]).map(([f, n]) => <li key={f} className="flex justify-between"><span>{f}</span><b>{n}</b></li>)}</ul> : <p className="text-sm muted">No flagged records.</p>}
          <Link className="mt-3 inline-block text-sm underline" href="/admin/words?flagged=1">Review flagged records</Link>
          <p className="mt-2 text-xs muted">Quizzes ignore stored quiz options unless an entry is marked “quiz verified”. Currently {rows.filter((r) => r.quiz_verified).length} are.</p></section>
      </div>
      <section className="card text-sm"><h2 className="h2 mb-2">Latest import</h2>{job ? <p><b>{job.batch_name}</b> · {job.status} · {job.rows_imported} imported, {job.rows_updated} updated, {job.rows_skipped} skipped, {job.rows_rejected} rejected · {new Date(job.created_at).toLocaleString()}</p> : <p className="muted">No imports recorded yet.</p>}<div className="mt-3 flex gap-2"><Link href="/admin/import" className="btn-primary">Import a CSV</Link><Link href="/admin/imports" className="btn-ghost">History</Link></div></section>
    </div>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { analyzeImportAction, commitImportAction, previewImportAction } from "@/app/actions/import";
import { FIELDS, LIMITS } from "@/lib/csv/schema";
import { errorReportToCsv } from "@/lib/csv/export";
import { Notice, Stat } from "./ui";

type Preview = Extract<Awaited<ReturnType<typeof previewImportAction>>, { ok: true }>;
type Analysis = Extract<Awaited<ReturnType<typeof analyzeImportAction>>, { ok: true }>;
type Done = Extract<Awaited<ReturnType<typeof commitImportAction>>, { ok: true }>;
const MODES = [["skip", "Skip duplicates", "Rows whose word + part of speech already exist are skipped. Same spelling with a different part of speech is imported as a separate entry."], ["update", "Update existing records", "Matching rows overwrite the stored record. Review the list of changes before confirming."], ["new_only", "Import only new words", "Strictest: skips any word whose spelling already exists, whatever its part of speech."]] as const;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function ImportWizard({ suggestedBatch }: { suggestedBatch: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [mode, setMode] = useState<"skip" | "update" | "new_only">("skip");
  const [an, setAn] = useState<Analysis | null>(null);
  const [batch, setBatch] = useState(suggestedBatch), [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState(""), [drag, setDrag] = useState(false), [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const form = (extra: Record<string, string> = {}) => { const fd = new FormData(); fd.append("file", file!); fd.append("mapping", JSON.stringify(mapping)); fd.append("mode", mode); Object.entries(extra).forEach(([k, v]) => fd.append(k, v)); return fd; };
  const reset = () => { setFile(null); setPv(null); setAn(null); setDone(null); setError(""); setConfirm(false); if (input.current) input.current.value = ""; };

  const pick = (f: File | undefined) => {
    setError(""); setPv(null); setAn(null); setDone(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Please choose a .csv file.");
    if (f.size > LIMITS.maxFileBytes) return setError(`File is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`);
    setFile(f);
    start(async () => {
      const fd = new FormData(); fd.append("file", f);
      const r = await previewImportAction(fd);
      if (!r.ok) return setError(r.error);
      setPv(r); setMapping(r.mapping);
    });
  };
  const analyze = () => start(async () => { setError(""); const r = await analyzeImportAction(form()); if (!r.ok) return setError(r.error); setAn(r); });
  const commit = () => start(async () => { setError(""); const r = await commitImportAction(form({ confirm: "yes", batch })); if (!r.ok) return setError(r.error); setDone(r); });

  const missing = FIELDS.filter((f) => f.required && !mapping[f.name]).map((f) => f.name);
  return (
    <div className="space-y-5" aria-busy={pending}>
      {error && <Notice kind="error">{error}</Notice>}

      {/* 1 Upload */}
      <section className="card space-y-3"><h2 className="h2">1. Choose a CSV file</h2>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`grid place-items-center rounded-xl border-2 border-dashed p-8 text-center ${drag ? "border-brand-600 bg-brand-50 dark:bg-slate-800" : "border-slate-300 dark:border-slate-700"}`}>
          <p className="text-sm">Drag a .csv file here, or</p>
          <label className="btn-primary mt-2 cursor-pointer">Browse files<input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <p className="mt-2 text-xs muted">UTF-8 (with or without BOM) · max {LIMITS.maxFileBytes / 1024 / 1024} MB · max {LIMITS.maxRows.toLocaleString()} rows</p>
        </div>
        {file && <p className="text-sm">{file.name} · {(file.size / 1024).toFixed(1)} KB {pending && !pv && "· reading…"}</p>}
      </section>

      {/* 2 Preview + mapping */}
      {pv && !done && (
        <section className="card space-y-4"><h2 className="h2">2. Preview &amp; column mapping</h2>
          <p className="text-sm"><b>{pv.total}</b> records detected · {pv.headers.length} columns</p>
          {pv.duplicateHeaders.length > 0 && <Notice kind="info">Repeated column name(s): {pv.duplicateHeaders.join(", ")}. The first one is used.</Notice>}
          {pv.parseErrors.length > 0 && <Notice kind="warn">CSV syntax warnings: {pv.parseErrors.map((e) => `record ${e.row}: ${e.message}`).join("; ")}</Notice>}
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{pv.headers.map((h) => <th key={h} className="whitespace-nowrap border-b border-slate-300 p-2 text-left dark:border-slate-700">{h}</th>)}</tr></thead>
            <tbody>{pv.preview.map((r, i) => <tr key={i}>{pv.headers.map((h) => <td key={h} className="max-w-[14rem] truncate border-b border-slate-200 p-2 dark:border-slate-800" title={r[h]}>{r[h]}</td>)}</tr>)}</tbody></table></div>
          <div className="grid gap-3 sm:grid-cols-3">{FIELDS.map((f) => (
            <div key={f.name}><label className="label" htmlFor={`m-${f.name}`}>{f.name}{f.required && <span className="text-red-600"> *</span>}</label>
              <select id={`m-${f.name}`} className="input" value={mapping[f.name] ?? ""} onChange={(e) => { setMapping({ ...mapping, [f.name]: e.target.value || null }); setAn(null); }}>
                <option value="">{f.required ? "— choose column —" : "— not in file —"}</option>{pv.headers.map((h) => <option key={h} value={h}>{h}</option>)}</select></div>))}</div>
          {missing.length > 0 && <Notice kind="error">Required field(s) not mapped: {missing.join(", ")}.</Notice>}
          <fieldset className="space-y-2"><legend className="label">Duplicate handling</legend>{MODES.map(([v, l, d]) => (
            <label key={v} className="flex items-start gap-2 text-sm"><input type="radio" className="mt-1" name="mode" checked={mode === v} onChange={() => { setMode(v); setAn(null); }} /><span><b>{l}</b><br /><span className="muted">{d}</span></span></label>))}</fieldset>
          <button className="btn-primary" disabled={pending || missing.length > 0} onClick={analyze}>{pending ? "Validating…" : "Validate (nothing is written yet)"}</button>
        </section>)}

      {/* 3 Validation report */}
      {an && !done && (
        <section className="card space-y-4"><h2 className="h2">3. Validation result</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Detected" value={an.counts.detected} /><Stat label="To import" value={an.counts.insert} /><Stat label="To update" value={an.counts.update} /><Stat label="Skipped" value={an.counts.skipped} /><Stat label="Rejected" value={an.counts.rejected} /><Stat label="Warnings" value={an.counts.warnings} /><Stat label="Conflicts" value={an.counts.conflicts} /></div>
          {an.headerNotes.map((n) => <Notice key={n} kind="info">{n}</Notice>)}
          {an.counts.rejected > 0 && <Notice kind="error">{an.counts.rejected} row(s) have errors and will NOT be imported.</Notice>}
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="p-2">Severity</th><th>Code</th><th>Rows</th><th>What it means</th></tr></thead>
            <tbody>{an.groups.map((g) => <tr key={g.code} className="border-t border-slate-200 dark:border-slate-800"><td className="p-2">{g.severity}</td><td className="font-mono text-xs">{g.code}</td><td>{g.count}</td><td>{g.message}</td></tr>)}</tbody></table></div>
          {an.rejected.length > 0 && <details open><summary className="cursor-pointer font-medium">Rejected rows ({an.counts.rejected})</summary><ul className="mt-2 space-y-1 text-sm">{an.rejected.map((r) => <li key={r.row}>Row {r.row}: {r.messages.join("; ")}</li>)}</ul></details>}
          {an.skipped.length > 0 && <details><summary className="cursor-pointer font-medium">Skipped as duplicates ({an.counts.skipped})</summary><ul className="mt-2 space-y-1 text-sm">{an.skipped.map((r) => <li key={r.row}>Row {r.row} “{r.word}”: {r.reason}</li>)}</ul></details>}
          {an.conflicts.length > 0 && <details><summary className="cursor-pointer font-medium">Same word, different part of speech ({an.counts.conflicts})</summary><ul className="mt-2 space-y-1 text-sm">{an.conflicts.map((r) => <li key={r.row}>Row {r.row} “{r.word}”: {r.reason}</li>)}</ul></details>}
          {an.changes.length > 0 && <details open><summary className="cursor-pointer font-medium">Existing records that would change ({an.changes.length})</summary><ul className="mt-2 space-y-1 text-sm">{an.changes.map((c, i) => <li key={i}>“{c.word}” {c.pos ? `(${c.pos})` : ""}: {c.fields.join(", ")}</li>)}</ul></details>}
          <button className="btn-ghost" onClick={() => download("import_issues.csv", errorReportToCsv(an.issues))}>Download issues report (CSV)</button>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="font-semibold">4. Confirm and import</h3>
            <div className="max-w-xs"><label className="label" htmlFor="batch">Batch name</label><input id="batch" className="input" value={batch} onChange={(e) => setBatch(e.target.value)} /></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /><span>I have reviewed this report. Write <b>{an.counts.insert}</b> new and <b>{an.counts.update}</b> updated record(s) to the live database.</span></label>
            <button className="btn-primary" disabled={pending || !confirm || (an.counts.insert + an.counts.update === 0)} onClick={commit}>{pending ? "Importing…" : "Import now"}</button></div>
        </section>)}

      {/* 5 Final report */}
      {done && (
        <section className="card space-y-4"><h2 className="h2">Import {done.report.status === "completed" ? "completed" : done.report.status === "failed" ? "failed" : "completed with errors"}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat label="Rows detected" value={done.report.detected} /><Stat label="Imported" value={done.report.imported} /><Stat label="Updated" value={done.report.updated} /><Stat label="Skipped" value={done.report.skipped} /><Stat label="Rejected" value={done.report.rejected} /></div>
          {done.report.failed.length > 0 && <Notice kind="error"><b>Some rows could not be written:</b><ul className="mt-1 list-disc pl-4">{done.report.failed.map((f, i) => <li key={i}>{f.error} ({f.rows.slice(0, 6).join(", ")}{f.rows.length > 6 ? "…" : ""})</li>)}</ul></Notice>}
          {done.retryHint && <Notice kind="warn">{done.retryHint}</Notice>}
          {!done.auditSaved && <Notice kind="warn">The import ran, but its history record could not be saved.</Notice>}
          <div className="flex flex-wrap gap-2">{done.jobId && <a className="btn-ghost" href={`/api/admin/imports/${done.jobId}/errors`}>Download error/warning report</a>}<a className="btn-ghost" href="/admin/words?flagged=1">Review flagged words</a><button className="btn-primary" onClick={reset}>Import another file</button></div>
        </section>)}
    </div>
  );
}

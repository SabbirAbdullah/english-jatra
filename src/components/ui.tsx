import Link from "next/link";

const LEVEL_COLOR: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200", A2: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  B1: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200", B2: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  C1: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200", C2: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};
export const CefrBadge = ({ level, provisional }: { level: string; provisional?: boolean }) => (
  <span className={`badge ${LEVEL_COLOR[level] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`} title={provisional ? "Provisional level: not yet verified against an official CEFR list" : undefined}>{level === "unknown" ? "Level ?" : level}{provisional ? "*" : ""}</span>
);

export const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="card !p-4"><p className="text-xs font-medium uppercase tracking-wide muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p>{hint && <p className="mt-0.5 text-xs muted">{hint}</p>}</div>
);

export const Empty = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="card text-center"><p className="font-medium">{title}</p>{children && <div className="muted mt-1 text-sm">{children}</div>}</div>
);

export const Chips = ({ items, link }: { items: string[]; link?: boolean }) => (
  <div className="flex flex-wrap gap-1.5">{items.map((t) => link
    ? <Link key={t} href={`/vocabulary?q=${encodeURIComponent(t)}`} className="badge bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">{t}</Link>
    : <span key={t} className="badge bg-slate-100 dark:bg-slate-800">{t}</span>)}</div>
);

export function Pagination({ page, total, size, base, params }: { page: number; total: number; size: number; base: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (p: number) => { const q = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && q.set(k, v)); q.set("page", String(p)); return `${base}?${q}`; };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="muted">Page {page} of {pages} · {total} words</span>
      {page < pages ? <Link className="btn-ghost" href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}

export function BarChart({ data, max, label }: { data: { label: string; value: number }[]; max?: number; label: string }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={label}>
      <div className="flex h-32 items-end gap-1.5">{data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
          <span className="text-[10px] muted">{d.value || ""}</span>
          <div className="w-full rounded-t bg-brand-500" style={{ height: `${(d.value / m) * 100}%`, minHeight: d.value ? 3 : 1, opacity: d.value ? 1 : 0.25 }} />
        </div>))}</div>
      <div className="mt-1 flex gap-1.5">{data.map((d) => <span key={d.label} className="flex-1 truncate text-center text-[10px] muted">{d.label}</span>)}</div>
    </figure>
  );
}

export const Progress = ({ value, max }: { value: number; max: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, max ? (value / max) * 100 : 0)}%` }} />
  </div>
);

export const Notice = ({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) => (
  <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${{
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100",
    warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" }[kind]}`}>{children}</div>
);

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LEVELS, POS_FILTERS, type Category } from "@/lib/types";

export function Filters({ categories, admin }: { categories: Category[]; admin?: boolean }) {
  const router = useRouter(), pathname = usePathname(), sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    v ? p.set(k, v) : p.delete(k); p.delete("page");
    start(() => router.replace(`${pathname}?${p}`));
  };
  useEffect(() => { const t = setTimeout(() => { if ((sp.get("q") ?? "") !== q) set("q", q); }, 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = (name: string, label: string, opts: [string, string][]) => (
    <div><label className="label" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} className="input" value={sp.get(name) ?? ""} onChange={(e) => set(name, e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  return (
    <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-busy={pending}>
      <div className="sm:col-span-2"><label className="label" htmlFor="f-q">Search English, Bengali, synonyms</label>
        <input id="f-q" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. achieve or অর্জন" /></div>
      {sel("level", "Level", [["", "All levels"], ...LEVELS.map((l) => [l, l] as [string, string])])}
      {sel("pos", "Part of speech", [["", "All"], ...POS_FILTERS.map((l) => [l, l] as [string, string])])}
      {sel("cat", "Topic", [["", "All topics"], ...categories.map((c) => [c.id, c.name] as [string, string])])}
      {sel("sort", "Sort", [["", "A → Z"], ["level", "Difficulty"], ["recent", "Recently added"]])}
      {admin && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={sp.get("flagged") === "1"} onChange={(e) => set("flagged", e.target.checked ? "1" : "")} /> Only entries with review flags</label>}
    </div>
  );
}

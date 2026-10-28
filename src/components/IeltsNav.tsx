"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const T = [["/ielts", "Overview"], ["/ielts/speaking", "Speaking"], ["/ielts/writing", "Writing"], ["/ielts/reading", "Reading"], ["/ielts/listening", "Listening"]];
export function IeltsNav() {
  const p = usePathname();
  return <nav aria-label="IELTS sections" className="flex flex-wrap gap-2">{T.map(([h, l]) => <Link key={h} href={h} aria-current={p === h ? "page" : undefined} className={p === h ? "btn-primary" : "btn-ghost"}>{l}</Link>)}</nav>;
}

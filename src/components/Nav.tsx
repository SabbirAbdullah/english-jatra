"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Home, Layers, ListChecks, MessageSquare, Settings, Shield, Target, Menu, LogIn } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/quiz", label: "Quizzes", icon: ListChecks },
  { href: "/my", label: "My Learning", icon: Target },
  { href: "/ielts", label: "IELTS", icon: GraduationCap },
  { href: "/practice", label: "Spoken English", icon: MessageSquare },
];

export function Nav({ email, admin }: { email: string | null; admin: boolean }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const items = [...ITEMS, ...(email ? [{ href: "/settings", label: "Settings", icon: Settings }] : []), ...(admin ? [{ href: "/admin", label: "Admin", icon: Shield }] : [])];
  const link = (i: (typeof items)[number]) => (
    <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active(i.href) ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-100" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
      <i.icon size={18} aria-hidden /> {i.label}
    </Link>
  );
  const account = email ? (
    <form action="/auth/signout" method="post" className="flex items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-xs muted lg:inline" title={email}>{email}</span>
      <button className="btn-ghost !py-1.5">Sign out</button>
    </form>
  ) : (
    <div className="flex gap-2"><Link href="/login" className="btn-ghost !py-1.5"><LogIn size={15} aria-hidden /> Sign in</Link><Link href="/register" className="btn-primary !py-1.5 hidden sm:inline-flex">Sign up</Link></div>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          <img src="/templates/EnglishJani_logo.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg object-cover" />
          <span>EnglishJatra</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">{items.map(link)}</nav>
        <p className="px-2 text-xs muted">Guests can browse words. Sign in to save progress.</p>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:ml-60">
        <details className="relative md:hidden">
          <summary className="btn-ghost cursor-pointer list-none !px-2.5" aria-label="Menu"><Menu size={18} /></summary>
          <div className="absolute left-0 top-11 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">{items.map(link)}</div>
        </details>
        <Link href="/" className="font-bold md:hidden">EnglishJatra</Link>
        <div className="ml-auto flex items-center gap-2"><ThemeToggle />{account}</div>
      </header>
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {[ITEMS[0], ITEMS[1], ITEMS[2], ITEMS[3], ITEMS[4]].map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(i.href) ? "text-brand-600 dark:text-brand-100" : "text-slate-500"}`}><i.icon size={20} aria-hidden />{i.label.split(" ")[0]}</Link>
        ))}
      </nav>
    </>
  );
}

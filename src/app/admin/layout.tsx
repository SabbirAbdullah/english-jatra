import Link from "next/link";
import { getUser, isAdmin } from "@/lib/auth";
import { Notice } from "@/components/ui";

export const metadata = { title: "Admin" };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await getUser();
  if (!user || !(await isAdmin(sb, user.id))) {
    return <div className="mx-auto max-w-lg space-y-3"><h1 className="h1">Administrators only</h1><Notice kind="error">Your account does not have administrator access. Roles are assigned in the database; see docs/GUIDE.md, “Create the first admin”.</Notice></div>;
  }
  const L = [["/admin", "Overview"], ["/admin/words", "Words"], ["/admin/import", "Import CSV"], ["/admin/imports", "Import history"], ["/admin/export", "Export"]];
  return (<div className="space-y-4"><nav aria-label="Admin" className="flex flex-wrap gap-2">{L.map(([h, l]) => <Link key={h} href={h} className="btn-ghost">{l}</Link>)}</nav>{children}</div>);
}

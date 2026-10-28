import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";
import { Notice } from "@/components/ui";

export const metadata = { title: "Sign in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm"><div className="card space-y-4">
      <h1 className="h1">Sign in</h1>
      {sp.error && <Notice kind="error">That link is invalid or has expired. Request a new one.</Notice>}
      <LoginForm next={sp.next ?? "/"} />
      <p className="text-sm muted"><Link className="underline" href="/reset-password">Forgot password?</Link> · <Link className="underline" href="/register">Create an account</Link></p>
    </div></div>
  );
}

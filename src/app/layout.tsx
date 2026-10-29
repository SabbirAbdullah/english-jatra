import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getUser, isAdmin } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "English Jani", template: "%s · English Jani" }, description: "English vocabulary, spoken English and IELTS practice for Bengali-speaking learners." };

const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(\\w+)/);var t=m?m[1]:'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = isConfigured();
  let email: string | null = null, admin = false;
  if (configured) {
    const { sb, user } = await getUser();
    if (user) { email = user.email ?? "Account"; admin = await isAdmin(sb, user.id); }
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <Nav email={email} admin={admin} />
        <main className="mx-auto max-w-6xl p-4 pb-28 md:ml-60 md:p-8 md:pb-10">
          {configured ? <Suspense>{children}</Suspense> : (
            <div className="card max-w-xl">
              <h1 className="h1">Supabase is not configured</h1>
              <p className="muted mt-2 text-sm">Copy <code>.env.example</code> to <code>.env.local</code>, fill in <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart the server. See docs/GUIDE.md, step 3.</p>
            </div>
          )}
        </main>
      </body>
    </html>
  );
}

import Link from "next/link";
import { RegisterForm } from "@/components/AuthForms";
export const metadata = { title: "Create account" };
export default function Page() {
  return (<div className="mx-auto max-w-sm"><div className="card space-y-4"><h1 className="h1">Create your account</h1><p className="text-sm muted">An account saves your progress, flashcards, quiz history and practice sentences. Vocabulary browsing stays free without one.</p><RegisterForm /><p className="text-sm muted">Already registered? <Link className="underline" href="/login">Sign in</Link></p></div></div>);
}

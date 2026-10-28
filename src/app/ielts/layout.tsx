import { IeltsNav } from "@/components/IeltsNav";
import { Notice } from "@/components/ui";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<div className="space-y-4"><h1 className="h1">IELTS practice</h1><IeltsNav /><Notice kind="warn">Practice material and automatic checks only. Nothing here is an official IELTS test or band score.</Notice>{children}</div>);
}

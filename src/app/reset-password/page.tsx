import { ResetForm } from "@/components/AuthForms";
export const metadata = { title: "Reset password" };
export default function Page() {
  return (<div className="mx-auto max-w-sm"><div className="card space-y-4"><h1 className="h1">Reset your password</h1><p className="text-sm muted">Enter your email and we will send a reset link.</p><ResetForm /></div></div>);
}

import { PasswordForm } from "@/components/AuthForms";
export const metadata = { title: "Change password" };
export default function Page() {
  return (<div className="mx-auto max-w-sm"><div className="card space-y-4"><h1 className="h1">Choose a new password</h1><PasswordForm /></div></div>);
}

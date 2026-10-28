"use client";
import { useActionState } from "react";
import { resetPasswordAction, signInAction, signUpAction, updatePasswordAction, type FormState } from "@/app/actions/auth";
import { Notice } from "./ui";

const Msg = ({ s }: { s: FormState }) => (s?.error ? <Notice kind="error">{s.error}</Notice> : s?.message ? <Notice kind="ok">{s.message}</Notice> : null);
const Field = ({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (<div><label className="label" htmlFor={p.name}>{label}</label><input id={p.name} className="input" required {...p} /></div>);

export function LoginForm({ next }: { next: string }) {
  const [s, a, pending] = useActionState(signInAction, undefined);
  return (<form action={a} className="space-y-4"><input type="hidden" name="next" value={next} /><Field label="Email" name="email" type="email" autoComplete="email" /><Field label="Password" name="password" type="password" autoComplete="current-password" /><Msg s={s} /><button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>);
}
export function RegisterForm() {
  const [s, a, pending] = useActionState(signUpAction, undefined);
  return (<form action={a} className="space-y-4"><Field label="Email" name="email" type="email" autoComplete="email" /><Field label="Password (8+ characters)" name="password" type="password" minLength={8} autoComplete="new-password" /><Field label="Confirm password" name="confirm" type="password" minLength={8} autoComplete="new-password" /><Msg s={s} /><button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button></form>);
}
export function ResetForm() {
  const [s, a, pending] = useActionState(resetPasswordAction, undefined);
  return (<form action={a} className="space-y-4"><Field label="Email" name="email" type="email" autoComplete="email" /><Msg s={s} /><button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button></form>);
}
export function PasswordForm() {
  const [s, a, pending] = useActionState(updatePasswordAction, undefined);
  return (<form action={a} className="space-y-4"><Field label="New password" name="password" type="password" minLength={8} autoComplete="new-password" /><Field label="Confirm new password" name="confirm" type="password" minLength={8} autoComplete="new-password" /><Msg s={s} /><button className="btn-primary" disabled={pending}>Update password</button></form>);
}

import Link from "next/link";
export const metadata = { title: "IELTS" };
const M = [["/ielts/speaking", "Speaking", "Part 1, 2 and 3 questions, cue-card timer, optional recording, written answers."], ["/ielts/writing", "Writing", "Task 1 and Task 2 prompts, editor with word count, saved drafts and basic checks."], ["/ielts/reading", "Reading", "A practice passage with multiple-choice, True/False/Not Given and short-answer questions."], ["/ielts/listening", "Listening", "Needs audio you own or that is licensed for reuse. See how to add it."]];
export default function Page() {
  return (<div className="grid gap-4 sm:grid-cols-2">{M.map(([h, t, d]) => <Link key={h} href={h} className="card hover:border-brand-500"><h2 className="h2">{t}</h2><p className="mt-1 text-sm muted">{d}</p></Link>)}
    <div className="card sm:col-span-2 text-sm muted">All prompts and the reading passage are original practice content written for this app. They are not copied from IELTS tests or paid preparation books.</div></div>);
}

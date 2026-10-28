import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCategories, getWord } from "@/lib/data";
import { AdminWordForm } from "@/components/AdminWordForm";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { sb } = await getUser();
  const w = await getWord(sb, (await params).id);
  if (!w) notFound();
  return (<div className="space-y-4"><h1 className="h1">Edit “{w.english_word}”</h1>{w.review_flags.length > 0 && <p className="text-sm muted">Flags: {w.review_flags.join(", ")}</p>}<AdminWordForm word={w} categories={await getCategories(sb)} /></div>);
}

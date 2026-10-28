import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { QuizRunner } from "@/components/QuizRunner";

export const metadata = { title: "Quizzes" };
export default async function Page({ searchParams }: { searchParams: Promise<{ word?: string }> }) {
  const sp = await searchParams;
  const cats = await getCategories(await createClient());
  return (<div className="space-y-4"><h1 className="h1">Vocabulary quizzes</h1><QuizRunner categories={cats} wordId={sp.word && /^[0-9a-f-]{36}$/i.test(sp.word) ? sp.word : undefined} /></div>);
}

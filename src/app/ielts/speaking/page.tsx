import { createClient } from "@/lib/supabase/server";
import { IeltsSpeaking } from "@/components/IeltsSpeaking";
export const metadata = { title: "IELTS Speaking" };
export default async function Page() {
  const sb = await createClient();
  const { data } = await sb.from("vocabulary_words").select("id,english_word,bengali_meaning").eq("status", "published").in("cefr_level", ["B1", "B2", "C1"]).limit(200);
  const sample = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 6);
  return <IeltsSpeaking suggestions={sample} />;
}

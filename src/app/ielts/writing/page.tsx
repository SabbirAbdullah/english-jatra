import { getUser } from "@/lib/auth";
import { IeltsWriting } from "@/components/IeltsWriting";
export const metadata = { title: "IELTS Writing" };
export default async function Page() {
  const { sb, user } = await getUser();
  const { data } = user ? await sb.from("ielts_responses").select("id,task,prompt,body,word_count,status,updated_at").eq("user_id", user.id).eq("module", "writing").order("updated_at", { ascending: false }).limit(30) : { data: [] };
  return <IeltsWriting history={data ?? []} signedIn={!!user} />;
}

import { getUser } from "@/lib/auth";

/** Everything stored about the signed-in user, as UTF-8 JSON (RLS limits each query to their own rows). */
export async function GET() {
  const { sb, user } = await getUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const [profile, progress, saved, attempts, sentences, ielts] = await Promise.all([
    sb.from("user_profiles").select("*").eq("user_id", user.id), sb.from("user_word_progress").select("*").eq("user_id", user.id),
    sb.from("saved_words").select("*").eq("user_id", user.id), sb.from("quiz_attempts").select("*, quiz_responses(*)").eq("user_id", user.id),
    sb.from("practice_sentences").select("*").eq("user_id", user.id), sb.from("ielts_responses").select("*").eq("user_id", user.id),
  ]);
  const body = { exported_at: new Date().toISOString(), email: user.email, profile: profile.data, word_progress: progress.data, saved_words: saved.data, quiz_attempts: attempts.data, practice_sentences: sentences.data, ielts_responses: ielts.data };
  return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="my_learning_data.json"' } });
}

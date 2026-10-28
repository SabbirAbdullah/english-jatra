import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabRecord } from "../csv/schema";
import type { VocabStore } from "./commit";

/** Idempotent Supabase writer shared by the CLI seed script and the admin import screen. */
export function makeSupabaseStore(client: SupabaseClient<any>, batch: string): VocabStore {
  const prepare = async (recs: VocabRecord[]) => {
    const names = [...new Set(recs.map((r) => r.category).filter(Boolean))] as string[];
    const ids = new Map<string, string>();
    if (names.length) {
      const up = await client.from("categories").upsert(names.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
      if (up.error) throw new Error(up.error.message);
      const { data, error } = await client.from("categories").select("id,name").in("name", names);
      if (error) throw new Error(error.message);
      (data ?? []).forEach((c: any) => ids.set(c.name, c.id));
    }
    return recs.map(({ category, ...r }) => ({ ...r, category_id: category ? ids.get(category) ?? null : null, import_batch: batch }));
  };
  const write = async (recs: VocabRecord[], ignoreDuplicates: boolean) => {
    try {
      const { error } = await client.from("vocabulary_words").upsert(await prepare(recs), { onConflict: "normalized_word,pos_key", ignoreDuplicates });
      return { error: error?.message };
    } catch (e) { return { error: (e as Error).message }; }
  };
  return { insertNew: (r) => write(r, true), updateExisting: (r) => write(r, false) };
}

/** All (normalized_word, pos_key) pairs already stored, across every previous batch. */
export async function loadExistingIndex(client: SupabaseClient<any>) {
  const keys = new Set<string>(), words = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("vocabulary_words").select("normalized_word,pos_key").order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((r: any) => { keys.add(`${r.normalized_word}|${r.pos_key}`); words.add(r.normalized_word); });
    if (!data || data.length < 1000) break;
  }
  return { keys, words };
}

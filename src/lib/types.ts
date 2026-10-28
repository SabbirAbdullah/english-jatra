export interface Word {
  id: string; external_id: string | null; import_batch: string | null; english_word: string; normalized_word: string; bengali_meaning: string;
  part_of_speech: string | null; pos_key: string; cefr_level: string; cefr_status: string; category_id: string | null; categories?: { name: string } | null;
  pronunciation: string | null; audio_url: string | null; collocations: string[]; example_sentence: string | null; example_translation_bn: string | null;
  synonyms: string[]; antonyms: string[]; word_forms: string[]; practice_sentence: string | null; flashcard_front: string | null; flashcard_back: string | null;
  quiz_question: string | null; quiz_correct_answer: string | null; quiz_options: string[]; quiz_verified: boolean; source_name: string | null; source_url: string | null; license_name: string | null; attribution_text: string | null; source_note: string | null;
  review_flags: string[]; status: string; created_at: string; updated_at: string;
}
export type Category = { id: string; name: string };
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const POS_FILTERS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase"] as const;

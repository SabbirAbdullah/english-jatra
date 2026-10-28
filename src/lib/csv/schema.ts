/** Canonical vocabulary import schema (v1). Machine-friendly snake_case headers. */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number] | "unknown";

/** Documented controlled part-of-speech values. Slash-combinations (noun/verb) are allowed. */
export const PARTS_OF_SPEECH = [
  "noun", "verb", "adjective", "adverb", "preposition", "conjunction",
  "pronoun", "interjection", "determiner", "phrase", "phrasal verb", "idiom",
] as const;

export const LIST_FIELDS = ["collocations", "synonyms", "antonyms", "word_forms", "quiz_options"] as const;
export type ListField = (typeof LIST_FIELDS)[number];

export interface FieldSpec {
  name: string;
  required: boolean;
  description: string;
  /** Header names (after lowercasing and replacing non-alphanumerics with "_") that auto-map to this field. */
  aliases: string[];
}

export const FIELDS: FieldSpec[] = [
  { name: "external_id", required: false, description: "Source file's own id. Kept for traceability only; never used as the sole identity (the database assigns a UUID).", aliases: ["id", "word_id", "external_id"] },
  { name: "english_word", required: true, description: "Headword. Non-empty, max 100 chars.", aliases: ["english_word", "word", "headword", "term"] },
  { name: "bengali_meaning", required: true, description: "Bengali meaning (required for the learning dataset).", aliases: ["bengali_meaning", "bangla_meaning", "meaning_bn", "bengali", "meaning"] },
  { name: "part_of_speech", required: false, description: "noun, verb, adjective, adverb, ... (slash-combinations allowed).", aliases: ["part_of_speech", "pos"] },
  { name: "cefr_level", required: false, description: "A1, A2, B1, B2, C1, C2 or unknown. Empty becomes unknown (warning).", aliases: ["cefr_level", "cefr", "level"] },
  { name: "category", required: false, description: "Topic category, free text, matched to categories table by name.", aliases: ["category", "topic"] },
  { name: "pronunciation", required: false, description: "Phonetic transcription (IPA). Never auto-generated.", aliases: ["pronunciation", "phonetic", "ipa"] },
  { name: "audio_url", required: false, description: "https URL to licensed audio.", aliases: ["audio_url", "audio"] },
  { name: "collocations", required: false, description: "Semicolon-separated list.", aliases: ["collocations", "collocation"] },
  { name: "example_sentence", required: false, description: "English example sentence.", aliases: ["example_sentence", "english_example", "example", "example_en"] },
  { name: "example_translation_bn", required: false, description: "Bengali translation of the example.", aliases: ["example_translation_bn", "example_bengali_translation", "example_bn", "example_translation"] },
  { name: "synonyms", required: false, description: "Semicolon-separated list.", aliases: ["synonyms", "synonym"] },
  { name: "antonyms", required: false, description: "Semicolon-separated list. Placeholders such as a lone dash are treated as empty.", aliases: ["antonyms", "antonym"] },
  { name: "word_forms", required: false, description: "Semicolon-separated list of related forms.", aliases: ["word_forms", "forms"] },
  { name: "practice_sentence", required: false, description: "Sentence-building prompt.", aliases: ["practice_sentence", "practice_prompt"] },
  { name: "flashcard_front", required: false, description: "Flashcard front text.", aliases: ["flashcard_front"] },
  { name: "flashcard_back", required: false, description: "Flashcard back text.", aliases: ["flashcard_back"] },
  { name: "quiz_question", required: false, description: "Quiz prompt.", aliases: ["quiz_question"] },
  { name: "quiz_correct_answer", required: false, description: "Must appear in quiz_options when both are given.", aliases: ["quiz_correct_answer", "quiz_answer"] },
  { name: "quiz_options", required: false, description: "Semicolon-separated answer choices.", aliases: ["quiz_options"] },
  { name: "source_name", required: false, description: "Source or dataset name.", aliases: ["source_name"] },
  { name: "source_url", required: false, description: "Source URL (http/https).", aliases: ["source_url"] },
  { name: "license_name", required: false, description: "License identifier. Never guessed.", aliases: ["license_name", "license"] },
  { name: "attribution_text", required: false, description: "Required attribution text.", aliases: ["attribution_text"] },
  { name: "source_note", required: false, description: "Free-text provenance note from the file.", aliases: ["source_note", "note"] },
];

export const FIELD_NAMES = FIELDS.map((f) => f.name);
export const REQUIRED_FIELDS = FIELDS.filter((f) => f.required).map((f) => f.name);

export const LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 10_000,
  maxFieldChars: 2_000,
  maxWordChars: 100,
} as const;

export interface VocabRecord {
  external_id: string | null;
  english_word: string;
  normalized_word: string;
  bengali_meaning: string;
  part_of_speech: string | null;
  pos_key: string;
  cefr_level: CefrLevel;
  cefr_status: "provisional" | "verified";
  category: string | null;
  pronunciation: string | null;
  audio_url: string | null;
  collocations: string[];
  example_sentence: string | null;
  example_translation_bn: string | null;
  synonyms: string[];
  antonyms: string[];
  word_forms: string[];
  practice_sentence: string | null;
  flashcard_front: string | null;
  flashcard_back: string | null;
  quiz_question: string | null;
  quiz_correct_answer: string | null;
  quiz_options: string[];
  source_name: string | null;
  source_url: string | null;
  license_name: string | null;
  attribution_text: string | null;
  source_note: string | null;
  review_flags: string[];
}

"use client";
import { useActionState } from "react";
import { deleteWordAction, saveWordAction } from "@/app/actions/admin";
import { LEVELS, type Category, type Word } from "@/lib/types";
import { Notice } from "./ui";

const J = (a?: string[]) => (a ?? []).join("; ");
export function ConfirmDelete({ id, word }: { id: string; word: string }) {
  return <form action={deleteWordAction} className="inline" onSubmit={(e) => { if (!confirm(`Delete “${word}”? This also removes related user progress for this word.`)) e.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="btn-ghost !py-1 text-red-600">Delete</button></form>;
}

export function AdminWordForm({ word, categories }: { word?: Word; categories: Category[] }) {
  const [s, a, pending] = useActionState(saveWordAction, undefined);
  const T = (name: string, label: string, v: string | null | undefined, extra: { area?: boolean; req?: boolean; hint?: string; span?: boolean } = {}) => (
    <div className={extra.span ? "sm:col-span-2" : ""}><label className="label" htmlFor={name}>{label}</label>
      {extra.area ? <textarea id={name} name={name} className="input min-h-16" defaultValue={v ?? ""} required={extra.req} /> : <input id={name} name={name} className="input" defaultValue={v ?? ""} required={extra.req} />}
      {extra.hint && <p className="mt-0.5 text-xs muted">{extra.hint}</p>}</div>);
  return (
    <form action={a} className="card space-y-4">
      {word && <input type="hidden" name="id" value={word.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {T("english_word", "English word", word?.english_word, { req: true })}{T("bengali_meaning", "Bengali meaning", word?.bengali_meaning, { req: true })}
        {T("part_of_speech", "Part of speech", word?.part_of_speech, { hint: "noun, verb, adjective… (noun/verb allowed)" })}
        <div><label className="label" htmlFor="cefr_level">CEFR level</label><select id="cefr_level" name="cefr_level" className="input" defaultValue={word?.cefr_level ?? "unknown"}><option value="unknown">unknown</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="cefr_status">CEFR status</label><select id="cefr_status" name="cefr_status" className="input" defaultValue={word?.cefr_status ?? "provisional"}><option value="provisional">provisional</option><option value="verified">verified (checked against an official list)</option></select></div>
        <div><label className="label" htmlFor="category">Category</label><input id="category" name="category" list="cats" className="input" defaultValue={word?.categories?.name ?? ""} /><datalist id="cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
        {T("pronunciation", "Pronunciation (IPA)", word?.pronunciation)}{T("audio_url", "Audio URL (licensed)", word?.audio_url)}
        {T("example_sentence", "Example sentence", word?.example_sentence, { area: true })}{T("example_translation_bn", "Example translation (Bengali)", word?.example_translation_bn, { area: true })}
        {T("collocations", "Collocations", J(word?.collocations), { hint: "Separate with ;" })}{T("synonyms", "Synonyms", J(word?.synonyms), { hint: "Separate with ;" })}
        {T("antonyms", "Antonyms", J(word?.antonyms), { hint: "Separate with ;" })}{T("word_forms", "Word forms", J(word?.word_forms), { hint: "Separate with ;" })}
        {T("practice_sentence", "Practice prompt", word?.practice_sentence, { span: true })}
        {T("flashcard_front", "Flashcard front", word?.flashcard_front)}{T("flashcard_back", "Flashcard back", word?.flashcard_back)}
        {T("quiz_question", "Stored quiz question", word?.quiz_question)}{T("quiz_correct_answer", "Stored correct answer", word?.quiz_correct_answer)}
        {T("quiz_options", "Stored quiz options", J(word?.quiz_options), { span: true, hint: "Separate with ;" })}
        {T("source_name", "Source name", word?.source_name)}{T("source_url", "Source URL", word?.source_url)}{T("license_name", "License", word?.license_name)}{T("attribution_text", "Attribution", word?.attribution_text)}{T("source_note", "Source note", word?.source_note, { span: true })}
        <div><label className="label" htmlFor="status">Visibility</label><select id="status" name="status" className="input" defaultValue={word?.status ?? "published"}><option value="published">published</option><option value="draft">draft (admins only)</option></select></div>
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="quiz_verified" defaultChecked={word?.quiz_verified} /> Quiz data reviewed and verified</label>
        {word && word.review_flags.length > 0 && <label className="flex items-center gap-2"><input type="checkbox" name="mark_reviewed" /> I have reviewed this entry: clear its flags ({word.review_flags.join(", ")})</label>}
      </div>
      {s?.error && <Notice kind="error">{s.error}</Notice>}
      <button className="btn-primary" disabled={pending}>{word ? "Save changes" : "Create word"}</button>
    </form>
  );
}

import type { VocabRecord } from "../csv/schema";
import type { ImportPlan } from "../csv/validate";

/** Storage abstraction so commit logic is testable without a live database. */
export interface VocabStore {
  /** Idempotent: inserts new rows, leaves existing (word,pos) rows untouched. Must be atomic per call. */
  insertNew(records: VocabRecord[]): Promise<{ error?: string }>;
  /** Idempotent: updates existing (word,pos) rows. Must be atomic per call. */
  updateExisting(records: VocabRecord[]): Promise<{ error?: string }>;
}

export interface CommitReport {
  detected: number;
  imported: number;
  updated: number;
  skipped: number;
  rejected: number;
  failed: { rows: string[]; error: string }[];
  status: "completed" | "completed_with_errors" | "failed";
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/**
 * Writes in batches. A failed batch is recorded (never silently dropped, never counted as imported)
 * and later batches still run. Because each batch is an idempotent upsert, re-running the same
 * import safely retries only what is missing.
 */
export async function commitPlan(store: VocabStore, plan: ImportPlan, detected: number, batchSize = 50): Promise<CommitReport> {
  const rep: CommitReport = { detected, imported: 0, updated: 0, skipped: plan.skipped.length, rejected: plan.rejected.length, failed: [], status: "completed" };
  for (const batch of chunk(plan.insert, batchSize)) {
    const { error } = await store.insertNew(batch);
    if (error) rep.failed.push({ rows: batch.map((r) => r.english_word), error }); else rep.imported += batch.length;
  }
  for (const batch of chunk(plan.update, batchSize)) {
    const { error } = await store.updateExisting(batch);
    if (error) rep.failed.push({ rows: batch.map((r) => r.english_word), error }); else rep.updated += batch.length;
  }
  const written = rep.imported + rep.updated;
  rep.status = rep.failed.length === 0 ? "completed" : written === 0 ? "failed" : "completed_with_errors";
  return rep;
}

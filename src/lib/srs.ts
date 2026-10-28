/**
 * Spaced repetition (simplified SM-2). Pure function so it is unit-tested.
 *  know      : interval 1d -> 3d -> round(interval * ease); ease +0.1 (max 3.0).
 *  learning  : review again in 10 minutes; ease unchanged.
 *  difficult : review again in 5 minutes; ease -0.2 (min 1.3); status "difficult".
 * A word becomes "known" only once its interval reaches 7 days, i.e. after several successful reviews.
 * Opening or flipping a card never changes anything.
 */
export type Rating = "know" | "learning" | "difficult";
export type WordStatus = "new" | "learning" | "known" | "difficult";
export interface Progress { status: WordStatus; ease: number; interval_days: number; attempts: number; correct_count: number }
export const KNOWN_AFTER_DAYS = 7;

export function nextProgress(p: Progress | null, rating: Rating, now = new Date()) {
  const cur: Progress = p ?? { status: "new", ease: 2.5, interval_days: 0, attempts: 0, correct_count: 0 };
  let { ease, interval_days: interval, correct_count: correct } = cur;
  let status: WordStatus;
  let due: Date;
  if (rating === "know") {
    interval = interval === 0 ? 1 : interval < 3 ? 3 : Math.round(interval * ease);
    ease = Math.min(3, +(ease + 0.1).toFixed(2));
    correct += 1;
    status = interval >= KNOWN_AFTER_DAYS ? "known" : "learning";
    due = new Date(now.getTime() + interval * 86_400_000);
  } else if (rating === "learning") {
    interval = 0; status = "learning"; due = new Date(now.getTime() + 10 * 60_000);
  } else {
    interval = 0; ease = Math.max(1.3, +(ease - 0.2).toFixed(2)); status = "difficult"; due = new Date(now.getTime() + 5 * 60_000);
  }
  return { status, ease, interval_days: interval, attempts: cur.attempts + 1, correct_count: correct, next_review_at: due.toISOString(), last_reviewed_at: now.toISOString() };
}

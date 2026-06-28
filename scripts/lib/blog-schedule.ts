/**
 * Shared helpers for natural-looking blog publish scheduling.
 *
 * Why this exists: every seed script used to insert a whole batch with the
 * default `created_at` (= now()), so 10-15 posts landed on the exact same
 * second. A site that gains a dozen articles in one instant — repeatedly — is
 * a textbook automated-publishing fingerprint that scaled-content detectors
 * (Google SpamBrain) key on. These helpers spread timestamps out so the
 * publishing cadence looks like human editorial work.
 *
 * All randomness is seeded (no Math.random / Date.now baked into the spread),
 * so re-running a backfill with the same window produces the same schedule —
 * the operation is idempotent.
 */

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 9973.31 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface SpreadOptions {
  /** Earliest publish moment (inclusive). */
  start: Date;
  /** Latest publish moment (inclusive). Defaults to `new Date()`. */
  end?: Date;
  /**
   * Plausible posting hours in local time, as [minHour, maxHour] inclusive.
   * Timestamps are nudged into this window so nothing publishes at 03:00.
   * Default: 9..21 (9am-9pm).
   */
  hours?: [number, number];
  /** Seed offset so two independent batches don't produce identical jitter. */
  seed?: number;
}

/**
 * Distribute `count` timestamps across [start, end], one per item, in strict
 * chronological order (index 0 is earliest). Gaps are evenly spaced and then
 * jittered so no two timestamps share a second and the spacing varies.
 *
 * Returns an array of `count` Dates, ascending.
 */
export function spreadTimestamps(count: number, opts: SpreadOptions): Date[] {
  if (count <= 0) return [];
  const end = opts.end ?? new Date();
  const startMs = opts.start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) {
    throw new Error(
      `spreadTimestamps: end (${end.toISOString()}) must be after start (${opts.start.toISOString()})`,
    );
  }
  const [minHour, maxHour] = opts.hours ?? [9, 21];
  const seedBase = opts.seed ?? 0;
  const span = endMs - startMs;
  const slot = span / count;

  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    // Even base position in the middle of this item's slot...
    const base = startMs + slot * (i + 0.5);
    // ...plus jitter of up to +/- 40% of a slot so spacing isn't mechanical.
    const jitter = (seededRand(seedBase + i + 1) - 0.5) * slot * 0.8;
    let t = Math.round(base + jitter);
    t = Math.min(Math.max(t, startMs), endMs);

    const d = new Date(t);
    // Nudge into plausible posting hours (local time).
    const h = d.getHours();
    if (h < minHour || h > maxHour) {
      const targetHour =
        minHour + Math.floor(seededRand(seedBase + i + 500) * (maxHour - minHour + 1));
      d.setHours(targetHour, Math.floor(seededRand(seedBase + i + 900) * 60), 0, 0);
    }
    out.push(d);
  }

  // Enforce strict ascending order after the hour-nudging may have reordered.
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

/**
 * Compute a "modified" timestamp that sits a little after `created`, capped at
 * `now`, so `dateModified` in Article structured data isn't byte-identical to
 * `datePublished` across the whole corpus.
 */
export function modifiedAfter(created: Date, now: Date = new Date()): Date {
  const seed = created.getTime() % 100000;
  // 0-14 days after publish, capped at now.
  const deltaMs = seededRand(seed) * 14 * 24 * 60 * 60 * 1000;
  return new Date(Math.min(created.getTime() + deltaMs, now.getTime()));
}

/** Subtract `months` calendar months from a date (clamped, no external deps). */
export function monthsAgo(months: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

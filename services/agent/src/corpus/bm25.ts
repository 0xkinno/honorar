const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'it', 'that', 'this', 'with', 'as', 'by', 'at', 'be', 'from', 'how', 'what', 'why', 'does', 'do']);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export type Scored<T> = { doc: T; score: number };

/** Okapi BM25 over title (weighted by repetition) and body. */
export function bm25<T>(docs: T[], text: (d: T) => string, title: (d: T) => string, query: string, k = 3): Scored<T>[] {
  const q = tokenize(query);
  if (q.length === 0 || docs.length === 0) return [];
  const toks = docs.map((d) => [...tokenize(title(d)), ...tokenize(title(d)), ...tokenize(text(d))]);
  const avg = toks.reduce((a, t) => a + t.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const k1 = 1.4;
  const b = 0.75;
  const scored = docs.map((doc, i) => {
    const t = toks[i] as string[];
    const tf = new Map<string, number>();
    for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
    let score = 0;
    for (const w of q) {
      const f = tf.get(w) ?? 0;
      if (f === 0) continue;
      const n = df.get(w) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avg)));
    }
    return { doc, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

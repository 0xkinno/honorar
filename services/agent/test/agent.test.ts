import { describe, expect, it } from 'vitest';
import type { WorkId } from '@honorar/kernel';
import { bm25 } from '../src/corpus/bm25';
import { htmlToText } from '../src/corpus/ingest';
import { planReads, projectedSpend } from '../src/loop';
import { extractSettlement } from '../src/gateway/reconciler';
import { feedbackScore } from '../src/erc8004';

const id = (n: number): WorkId => ('0x' + n.toString(16).padStart(64, '0')) as WorkId;
const reader = { active: true, maxPerAnswer: 50_000n, allowance: 1_000_000n, balance: 1_000_000n };

describe('retrieval', () => {
  it('ranks the topical doc first', () => {
    const docs = [
      { t: 'Cooking pasta', b: 'boil water and add salt to the pot' },
      { t: 'Stablecoin settlement', b: 'stablecoins settle value on a ledger that never closes' },
    ];
    const r = bm25(docs, (d) => d.b, (d) => d.t, 'how do stablecoins settle', 2);
    expect(r[0]?.doc.t).toBe('Stablecoin settlement');
  });
});

describe('ingest', () => {
  it('extracts article text and drops scripts', () => {
    const { title, text } = htmlToText('<html><title>T &amp; U</title><body><script>x()</script><article><p>Hello &ldquo;world&rdquo;</p><p>Two</p></article></body></html>');
    expect(title).toBe('T & U');
    expect(text).toBe('Hello "world"\nTwo');
  });
});

describe('planReads', () => {
  const ranked = [1, 2, 3, 4].map((n) => ({ workId: id(n), readPrice: 1000n, quotePrice: 4000n }));
  it('respects source limit and budget', () => {
    const p = planReads(ranked, 2500n, 3, reader);
    expect(p.chosen).toHaveLength(2);
    expect(p.dropped.every((d) => d.reason === 'reading budget')).toBe(true);
  });
  it('respects the mandate per-answer cap', () => {
    const p = planReads(ranked, 10_000n, 4, { ...reader, maxPerAnswer: projectedSpend(ranked.slice(0, 2)) });
    expect(p.chosen).toHaveLength(2);
    expect(p.dropped[0]?.reason).toBe('mandate per-answer cap');
  });
  it('reads nothing when the mandate is inactive', () => {
    expect(planReads(ranked, 10_000n, 4, { ...reader, active: false }).chosen).toHaveLength(0);
  });
  it('drops when allowance is short', () => {
    expect(planReads(ranked, 10_000n, 4, { ...reader, allowance: 100n }).chosen).toHaveLength(0);
  });
});

describe('reconciler', () => {
  it('finds a settlement hash in untyped fields and names the field', () => {
    const h = '0x' + 'ab'.repeat(32);
    expect(extractSettlement({ id: 'x', status: 'completed', settlement: { txHash: h } })).toEqual({ hash: h, field: 'settlement.txHash' });
    expect(extractSettlement({ id: 'x' })).toBeNull();
  });
});

describe('feedback', () => {
  it('scores verified over proposed', () => {
    expect(feedbackScore(2, 4)).toBe(50);
    expect(feedbackScore(0, 0)).toBe(0);
    expect(feedbackScore(1, 1)).toBe(100);
  });
});

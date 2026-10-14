import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import {
  contentHash,
  leafHash,
  merkleProof,
  merkleRoot,
  normalize,
  parseProposal,
  price,
  protocolFee,
  quotedSegments,
  runKernel,
  spanHash,
  splitShares,
  transfersHash,
  verifyProof,
  canonicalJson,
  type Hex,
  type KernelInput,
  type RegistrySnapshot,
  type RegistryWork,
  type WorkId,
} from '../src/index';

const [LDQ, RDQ, RSQ, EMD, ZWSP] = [0x201c, 0x201d, 0x2019, 0x2014, 0x200b].map((c) => String.fromCharCode(c));
const ID_A = ('0x' + 'aa'.repeat(32)) as WorkId;
const ID_B = ('0x' + 'bb'.repeat(32)) as WorkId;
const ID_C = ('0x' + 'cc'.repeat(32)) as WorkId;
const WRITER = ('0x' + '11'.repeat(20)) as Hex;

const TEXT_A =
  'Stablecoins settle value on a ledger that never closes, which means a payment made on Sunday night clears as fast as one made on Monday morning. ' +
  'This is a second paragraph about fees that nobody reads.';
const TEXT_B =
  'A citation is a claim about where words came from, and a claim is not the same thing as proof that the words were ever used by anyone.';
const TEXT_U = 'Unregistered authors write sentences that nobody pays for because their wallet is not known to any registry yet at all.';

const QUOTE_A = 'Stablecoins settle value on a ledger that never closes, which means a payment made on Sunday night clears as fast as one made on Monday morning.';
const QUOTE_B = 'A citation is a claim about where words came from, and a claim is not the same thing as proof that the words were ever used by anyone.';
const QUOTE_U = 'Unregistered authors write sentences that nobody pays for because their wallet is not known to any registry yet at all.';

function work(id: WorkId, text: string, quote = 4000n, active = true): RegistryWork {
  return { workId: id, contentHash: contentHash(text), version: 1, active, quotePrice: quote, readPrice: 1000n, recipients: [WRITER], bps: [10000] };
}

function snapshot(...ws: RegistryWork[]): RegistrySnapshot {
  return new Map(ws.map((w) => [w.workId, w]));
}

function input(over: Partial<KernelInput> & { answer: string; citations?: { workId: WorkId; quote: string }[] }): KernelInput {
  return {
    answerId: ('0x' + '01'.repeat(32)) as Hex,
    question: 'what settles?',
    proposal: { answer: over.answer, citations: over.citations ?? [] },
    registry: over.registry ?? snapshot(work(ID_A, TEXT_A), work(ID_B, TEXT_B)),
    sources: over.sources ?? [
      { workId: ID_A, text: TEXT_A },
      { workId: ID_B, text: TEXT_B },
    ],
    unregistered: over.unregistered ?? [],
    transferIds: over.transferIds ?? ['t2', 't1'],
    frontedReadingFees: over.frontedReadingFees ?? 2000n,
  };
}

describe('normalization', () => {
  it('handles quotes, dashes, zero width, whitespace and case', () => {
    const raw = `  ${LDQ}Hello${RDQ}${EMD}World${ZWSP}  it${RSQ}s   FINE `;
    expect(normalize(raw)).toBe('"hello"-world it\'s fine');
  });
  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme' }), (s) => normalize(normalize(s)) === normalize(s)),
      { numRuns: 500 },
    );
  });
  it('does not stem or paraphrase', () => {
    expect(normalize('Running quickly')).not.toBe(normalize('run quick'));
  });
});

describe('citation verification', () => {
  it('pays a verbatim quote used in the answer', () => {
    const r = runKernel(input({ answer: `As noted, "${QUOTE_A}" Indeed.`, citations: [{ workId: ID_A, quote: QUOTE_A }] }));
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0]?.amount).toBe(4000n);
    expect(r.leaves[0]?.origin).toBe('model');
    expect(r.refused).toHaveLength(0);
    expect(r.totals.fee).toBe(100n);
    expect(r.totals.spend).toBe(4000n + 100n + 2000n);
  });

  it('REFUSED_LENGTH for short quotes', () => {
    const r = runKernel(input({ answer: 'He said "stablecoins settle value" today.', citations: [{ workId: ID_A, quote: 'stablecoins settle value' }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_LENGTH');
    expect(r.leaves).toHaveLength(0);
  });

  it('REFUSED_NOT_IN_SOURCE for fabricated quotes (B1)', () => {
    const fake = 'Every stablecoin in the world will settle in under one second by the end of the year according to nobody.';
    const r = runKernel(input({ answer: `"${fake}"`, citations: [{ workId: ID_A, quote: fake }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_NOT_IN_SOURCE');
    expect(r.leaves).toHaveLength(0);
  });

  it('REFUSED_NOT_IN_SOURCE for paraphrase (B2)', () => {
    const para = 'Stablecoins move value on a ledger that stays open, so a payment sent on Sunday night is as quick as Monday morning ones.';
    const r = runKernel(input({ answer: `"${para}"`, citations: [{ workId: ID_A, quote: para }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_NOT_IN_SOURCE');
    expect(r.leaves).toHaveLength(0);
  });

  it('REFUSED_NOT_IN_ANSWER when quote is real but unused (I2)', () => {
    const r = runKernel(input({ answer: 'A plain answer with no quotation.', citations: [{ workId: ID_A, quote: QUOTE_A }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_NOT_IN_ANSWER');
    expect(r.leaves).toHaveLength(0);
  });

  it('REFUSED_NOT_IN_ANSWER when the words appear unquoted', () => {
    const r = runKernel(input({ answer: `Plainly, ${QUOTE_A}`, citations: [{ workId: ID_A, quote: QUOTE_A }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_NOT_IN_ANSWER');
  });

  it('REFUSED_SOURCE_CHANGED when text hash differs from registry', () => {
    const changed = work(ID_A, 'completely different registered text on chain for this work id');
    const r = runKernel(input({ answer: `"${QUOTE_A}"`, citations: [{ workId: ID_A, quote: QUOTE_A }], registry: snapshot(changed, work(ID_B, TEXT_B)) }));
    expect(r.refused[0]?.reason).toBe('REFUSED_SOURCE_CHANGED');
    expect(r.leaves).toHaveLength(0);
  });

  it('REFUSED_UNKNOWN_WORK for a work id that was never opened', () => {
    const r = runKernel(input({ answer: `"${QUOTE_A}"`, citations: [{ workId: ID_C, quote: QUOTE_A }] }));
    expect(r.refused[0]?.reason).toBe('REFUSED_UNKNOWN_WORK');
    // sweep still pays the true author of the words (I3)
    expect(r.leaves[0]?.workId).toBe(ID_A);
    expect(r.leaves[0]?.origin).toBe('kernel');
  });

  it('REFUSED_INACTIVE_WORK and owed record', () => {
    const r = runKernel(input({ answer: `"${QUOTE_A}"`, citations: [{ workId: ID_A, quote: QUOTE_A }], registry: snapshot(work(ID_A, TEXT_A, 4000n, false), work(ID_B, TEXT_B)) }));
    expect(r.refused[0]?.reason).toBe('REFUSED_INACTIVE_WORK');
    expect(r.leaves).toHaveLength(0);
    expect(r.owed.some((o) => o.reason === 'work_inactive')).toBe(true);
  });

  it('merges overlapping quotes into one leaf (one honorarium per work)', () => {
    const q1 = 'Stablecoins settle value on a ledger that never closes, which means a payment made on Sunday night';
    const q2 = 'which means a payment made on Sunday night clears as fast as one made on Monday morning.';
    const r = runKernel(input({ answer: `"${q1}" and also "${q2}"`, citations: [{ workId: ID_A, quote: q1 }, { workId: ID_A, quote: q2 }] }));
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0]?.spans).toHaveLength(1);
    expect(normalize(QUOTE_A).startsWith(r.leaves[0]?.spans[0] ?? 'x')).toBe(true);
  });

  it('keeps disjoint spans in one leaf and one payment', () => {
    const q1 = QUOTE_A;
    const q2 = 'This is a second paragraph about fees that nobody reads and so on.'.replace(' and so on', '');
    const r = runKernel(input({ answer: `"${q1}" ... "${q2}"`, citations: [{ workId: ID_A, quote: q1 }, { workId: ID_A, quote: q2 }] }));
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0]?.spans.length).toBe(2);
    expect(r.leaves[0]?.amount).toBe(4000n);
  });
});

describe('completeness sweep (I3)', () => {
  it('adds a kernel leaf for a quoted segment the model did not cite', () => {
    const r = runKernel(input({ answer: `"${QUOTE_B}"`, citations: [] }));
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0]?.workId).toBe(ID_B);
    expect(r.leaves[0]?.origin).toBe('kernel');
  });

  it('records OWED for an unregistered source (B9)', () => {
    const r = runKernel(input({ answer: `"${QUOTE_U}"`, unregistered: [{ url: 'https://example.org/u', text: TEXT_U }] }));
    expect(r.leaves).toHaveLength(0);
    expect(r.owed).toEqual([{ reason: 'writer_not_registered', sourceUrl: 'https://example.org/u', workId: null, quote: normalize(QUOTE_U) }]);
  });

  it('ignores short quoted fragments', () => {
    const r = runKernel(input({ answer: 'The word "settle" is common.' }));
    expect(r.leaves).toHaveLength(0);
    expect(r.owed).toHaveLength(0);
  });

  it('finds blockquote segments', () => {
    const r = runKernel(input({ answer: `Here is the passage:\n> ${QUOTE_A}\n\nEnd.` }));
    expect(r.leaves).toHaveLength(1);
  });

  it('finds curly-quoted segments', () => {
    const r = runKernel(input({ answer: `${LDQ}${QUOTE_A}${RDQ}` }));
    expect(r.leaves).toHaveLength(1);
  });
});

describe('model money (I10)', () => {
  it('parseProposal discards amounts, addresses and extra fields', () => {
    const p = parseProposal({
      answer: 'a',
      amount: 999999,
      payTo: '0xdead',
      citations: [
        { workId: ID_A, quote: 'q', amount: 5, payTo: '0xbeef' },
        { workId: 'nope', quote: 'x' },
      ],
    });
    expect(p).toEqual({ answer: 'a', citations: [{ workId: ID_A, quote: 'q' }] });
  });

  it('amounts always equal registry prices regardless of proposal', () => {
    const r = runKernel(input({ answer: `"${QUOTE_A}"`, citations: [{ workId: ID_A, quote: QUOTE_A, amount: 1_000_000 } as never] }));
    expect(r.leaves[0]?.amount).toBe(price(snapshot(work(ID_A, TEXT_A)), ID_A));
  });

  it('only pricing.ts brands Usdc6', () => {
    const src = ['verify.ts', 'merkle.ts', 'bundle.ts', 'normalize.ts'].map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n');
    expect(src).not.toMatch(/as Usdc6/);
    const pricing = readFileSync(new URL('../src/pricing.ts', import.meta.url), 'utf8');
    expect(pricing.match(/as Usdc6/g)).toHaveLength(1);
  });
});

describe('merkle and hashing', () => {
  const hashes = (n: number): Hex[] => Array.from({ length: n }, (_, i) => leafHash(('0x' + i.toString(16).padStart(64, '0')) as WorkId, 1, spanHash([`s${i}`]), 4000n));

  it('single leaf root equals the leaf hash', () => {
    const h = hashes(1);
    expect(merkleRoot(h)).toBe(h[0]);
  });

  it('proofs verify for every index', () => {
    for (const n of [2, 3, 4, 5, 7, 8, 11]) {
      const h = hashes(n);
      const root = merkleRoot(h);
      for (let i = 0; i < n; i++) expect(verifyProof(h[i] as Hex, merkleProof(h, i), root)).toBe(true);
    }
  });

  it('is deterministic and order sensitive only by given order', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (n) => merkleRoot(hashes(n)) === merkleRoot(hashes(n))),
      { numRuns: 40 },
    );
  });

  it('transfer hash ignores input order', () => {
    expect(transfersHash(['b', 'a'])).toBe(transfersHash(['a', 'b']));
  });

  it('splitShares never strands dust', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10_000_000n }), fc.array(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 5 }), (amt, raw) => {
        const sum = raw.reduce((a, b) => a + b, 0);
        const bps = raw.map((r) => Math.floor((r * 10000) / sum));
        bps[bps.length - 1] = (bps[bps.length - 1] ?? 0) + (10000 - bps.reduce((a, b) => a + b, 0));
        return splitShares(amt, bps).reduce((a, b) => a + b, 0n) === amt;
      }),
    );
  });

  it('fee is 2.5 percent floor', () => {
    expect(protocolFee(4000n)).toBe(100n);
    expect(protocolFee(3999n)).toBe(99n);
  });
});

describe('bundle', () => {
  it('is canonical and ties root to leaves', () => {
    const r = runKernel(input({ answer: `"${QUOTE_A}" and "${QUOTE_B}"` }));
    expect(r.leaves).toHaveLength(2);
    const text = canonicalJson(r.bundle);
    expect(canonicalJson(JSON.parse(text))).toBe(text);
    const hs = r.bundle.leaves.map((l) => leafHash(l.workId, l.version, l.spanHash, BigInt(l.amount)));
    expect(merkleRoot(hs)).toBe(r.bundle.root);
  });

  it('quotedSegments extracts normalized quoted text', () => {
    expect(quotedSegments(`He wrote "A B" then ${LDQ}C D${RDQ}`)).toEqual(['a b', 'c d']);
  });
});

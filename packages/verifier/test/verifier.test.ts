import { describe, expect, it } from 'vitest';
import { allPass, verifyBundle } from '../src/checks';
import { canonicalJson, normalize } from '@honorar/kernel';
import { ID_A, cleanBundle, chainFor, text, works } from './fixture';

describe('verifier', () => {
  it('passes a clean bundle (control)', async () => {
    const b = cleanBundle();
    const r = await verifyBundle(text(b), chainFor(b));
    expect(r.filter((x) => x.status === 'FAIL')).toEqual([]);
    expect(allPass(r)).toBe(true);
  });

  it('B7: one flipped byte fails V1 or V5', async () => {
    const b = cleanBundle();
    const t = text(b).replace('"amount": "4000"', '"amount": "4001"');
    const r = await verifyBundle(t, chainFor(b));
    expect(allPass(r)).toBe(false);
    expect(r.find((x) => x.id === 'V5')?.status).toBe('FAIL');
  });

  it('non canonical formatting fails V1', async () => {
    const b = cleanBundle();
    const r = await verifyBundle(JSON.stringify(b), chainFor(b));
    expect(r[0]?.status).toBe('FAIL');
  });

  it('B10: inflated fronted reading fees fails V6', async () => {
    const b = cleanBundle();
    const forged = { ...b, frontedReadingFees: '9999' };
    const r = await verifyBundle(canonicalJson(forged), chainFor(b));
    expect(r.find((x) => x.id === 'V6')?.status).toBe('FAIL');
  });

  it('B10: tampered transfer ids fail V8', async () => {
    const b = cleanBundle();
    const forged = { ...b, transferIds: ['t1', 'tX'] };
    const r = await verifyBundle(canonicalJson(forged), chainFor(b));
    expect(r.find((x) => x.id === 'V8')?.status).toBe('FAIL');
  });

  it('source text edited fails V2', async () => {
    const b = cleanBundle();
    const forged = { ...b, sources: b.sources.map((s, i) => (i === 0 ? { ...s, text: `${s.text} extra` } : s)) };
    const r = await verifyBundle(canonicalJson(forged), chainFor(b));
    expect(r.find((x) => x.id === 'V2')?.status).toBe('FAIL');
  });

  it('answer edited so the span is no longer quoted fails V3', async () => {
    const b = cleanBundle();
    const forged = { ...b, answer: 'No quotation remains in this answer at all.' };
    const r = await verifyBundle(canonicalJson(forged), chainFor(b));
    expect(r.find((x) => x.id === 'V3')?.status).toBe('FAIL');
  });

  it('dropped leaf fails V4 completeness', async () => {
    const b = cleanBundle();
    const forged = { ...b, leaves: [] };
    const r = await verifyBundle(canonicalJson(forged), chainFor(b));
    expect(r.find((x) => x.id === 'V4')?.status).toBe('FAIL');
  });

  it('version bumped on chain after strike block fails V7', async () => {
    const b = cleanBundle();
    const reg = works();
    const w = reg.get(ID_A);
    if (w) reg.set(ID_A, { ...w, version: 2 });
    const r = await verifyBundle(text(b), chainFor(b, reg));
    expect(r.find((x) => x.id === 'V7')?.status).toBe('FAIL');
  });

  it('spans are normalized source substrings', () => {
    const b = cleanBundle();
    const src = b.sources.find((s) => s.workId === ID_A);
    expect(normalize(src?.text ?? '')).toContain(b.leaves[0]?.spans[0]);
  });
});

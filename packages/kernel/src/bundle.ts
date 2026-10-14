import type { Bundle, Hex, KernelInput, RegistrySnapshot } from './types';

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, sortValue(o[k])]),
    );
  }
  return v;
}

/** Canonical JSON: sorted keys, two-space indent, trailing newline. */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export function parseBundle(text: string): Bundle {
  const b = JSON.parse(text) as Bundle;
  if (b.bundleVersion !== 1) throw new Error('unsupported bundle version');
  return b;
}

/** Rebuild kernel input from a bundle and an independently fetched registry snapshot. */
export function inputFromBundle(bundle: Bundle, registry: RegistrySnapshot): KernelInput {
  return {
    answerId: bundle.answerId as Hex,
    question: bundle.question,
    proposal: { answer: bundle.answer, citations: bundle.citations },
    registry,
    sources: bundle.sources.map((s) => ({ workId: s.workId, text: s.text })),
    unregistered: bundle.unregistered,
    transferIds: bundle.transferIds,
    frontedReadingFees: BigInt(bundle.frontedReadingFees),
  };
}

import { normalize, straightenQuotes, wordCount, contentHash } from './normalize';
import { leafHash, merkleRoot, spanHash, transfersHash } from './merkle';
import { FEE_BPS, price, protocolFee } from './pricing';
import {
  NORM_VERSION,
  type Bundle,
  type Hex,
  type KernelInput,
  type KernelResult,
  type Leaf,
  type ModelProposal,
  type Owed,
  type Refusal,
  type RegisteredSource,
  type WorkId,
} from './types';

export const MIN_WORDS = 8;
export const MAX_WORDS = 80;

/** Strips everything except answer and citations. Amounts or addresses from a model are discarded. */
export function parseProposal(raw: unknown): ModelProposal {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const answer = typeof obj.answer === 'string' ? obj.answer : '';
  const list = Array.isArray(obj.citations) ? obj.citations : [];
  const citations: ModelProposal['citations'] = [];
  for (const c of list) {
    if (typeof c !== 'object' || c === null) continue;
    const r = c as Record<string, unknown>;
    if (typeof r.workId === 'string' && /^0x[0-9a-fA-F]{64}$/.test(r.workId) && typeof r.quote === 'string') {
      citations.push({ workId: r.workId.toLowerCase() as WorkId, quote: r.quote });
    }
  }
  return { answer, citations };
}

/** Quoted segments of a raw answer: text inside straight or curly double quotes, and markdown blockquotes. */
export function quotedSegments(answer: string): string[] {
  const out: string[] = [];
  const straight = straightenQuotes(answer);
  const re = /"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(straight)) !== null) {
    out.push(m[1] as string);
  }
  const block: string[] = [];
  const flush = (): void => {
    if (block.length) out.push(block.join(' '));
    block.length = 0;
  };
  for (const line of straight.split(/\r?\n/)) {
    const bq = /^\s*>\s?(.*)$/.exec(line);
    if (bq) block.push(bq[1] as string);
    else flush();
  }
  flush();
  return out.map((s) => normalize(s)).filter((s) => s.length > 0);
}

type NormSource = {
  src: RegisteredSource;
  norm: string;
  hashOk: boolean;
};

type Interval = { start: number; end: number };

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

function overlaps(a: Interval, list: Interval[]): boolean {
  return list.some((b) => a.start < b.end && b.start < a.end);
}

export function runKernel(input: KernelInput): KernelResult {
  const proposal = parseProposal(input.proposal);
  const segments = quotedSegments(proposal.answer);

  const sources = new Map<WorkId, NormSource>();
  for (const s of input.sources) {
    const w = input.registry.get(s.workId);
    const norm = normalize(s.text);
    sources.set(s.workId, { src: s, norm, hashOk: !!w && contentHash(s.text) === w.contentHash });
  }

  const refused: Refusal[] = [];
  const owed: Owed[] = [];
  const verified = new Map<WorkId, Interval[]>();
  const modelCited = new Set<WorkId>();
  const addInterval = (workId: WorkId, iv: Interval, o: 'model' | 'kernel'): void => {
    const list = verified.get(workId) ?? [];
    list.push(iv);
    verified.set(workId, list);
    if (o === 'model') modelCited.add(workId);
  };

  for (const c of proposal.citations) {
    const quote = normalize(c.quote);
    const words = wordCount(quote);
    const refuse = (reason: Refusal['reason']): void => {
      refused.push({ workId: c.workId, quote: c.quote, reason });
    };
    if (words < MIN_WORDS || words > MAX_WORDS) {
      refuse('REFUSED_LENGTH');
      continue;
    }
    const work = input.registry.get(c.workId);
    const ns = sources.get(c.workId);
    if (!work || !ns) {
      refuse('REFUSED_UNKNOWN_WORK');
      continue;
    }
    if (!ns.hashOk) {
      refuse('REFUSED_SOURCE_CHANGED');
      continue;
    }
    const at = ns.norm.indexOf(quote);
    if (at < 0) {
      refuse('REFUSED_NOT_IN_SOURCE');
      continue;
    }
    if (!segments.some((seg) => seg.includes(quote))) {
      refuse('REFUSED_NOT_IN_ANSWER');
      continue;
    }
    if (!work.active) {
      refuse('REFUSED_INACTIVE_WORK');
      continue;
    }
    addInterval(c.workId, { start: at, end: at + quote.length }, 'model');
  }

  // Completeness sweep (I3): every quoted segment of substance that matches a source is accounted for.
  const registeredIds = [...sources.keys()].sort();
  const seenOwed = new Set<string>();
  for (const seg of segments) {
    const words = wordCount(seg);
    if (words < MIN_WORDS || words > MAX_WORDS) continue;
    let matched = false;
    for (const id of registeredIds) {
      const ns = sources.get(id as WorkId) as NormSource;
      if (!ns.hashOk) continue;
      const at = ns.norm.indexOf(seg);
      if (at < 0) continue;
      matched = true;
      const iv = { start: at, end: at + seg.length };
      if (overlaps(iv, verified.get(id as WorkId) ?? [])) continue;
      const work = input.registry.get(id as WorkId);
      if (!work) continue;
      if (!work.active) {
        const key = `inactive|${id}|${seg}`;
        if (!seenOwed.has(key)) {
          seenOwed.add(key);
          owed.push({ reason: 'work_inactive', sourceUrl: ns.src.url ?? null, workId: id as WorkId, quote: seg });
        }
        continue;
      }
      addInterval(id as WorkId, iv, 'kernel');
    }
    if (matched) continue;
    for (const u of input.unregistered) {
      if (normalize(u.text).includes(seg)) {
        const key = `unreg|${u.url}|${seg}`;
        if (!seenOwed.has(key)) {
          seenOwed.add(key);
          owed.push({ reason: 'writer_not_registered', sourceUrl: u.url, workId: null, quote: seg });
        }
      }
    }
  }

  const leaves: Leaf[] = [];
  for (const id of [...verified.keys()].sort()) {
    const ns = sources.get(id) as NormSource;
    const spans = mergeIntervals(verified.get(id) as Interval[]).map((iv) => ns.norm.slice(iv.start, iv.end));
    const work = input.registry.get(id);
    if (!work) continue;
    leaves.push({
      workId: id,
      version: work.version,
      spanHash: spanHash(spans),
      amount: price(input.registry, id),
      origin: modelCited.has(id) ? 'model' : 'kernel',
      spans,
    });
  }

  const hashes = leaves.map((l) => leafHash(l.workId, l.version, l.spanHash, l.amount));
  const root: Hex | null = hashes.length ? merkleRoot(hashes) : null;
  const total = leaves.reduce((a, l) => a + l.amount, 0n);
  const fee = protocolFee(total);
  const fronted = input.frontedReadingFees;
  const gatewayTransfersHash = transfersHash(input.transferIds);

  const bundle: Bundle = {
    bundleVersion: 1,
    normVersion: NORM_VERSION,
    answerId: input.answerId,
    question: input.question,
    answer: proposal.answer,
    citations: proposal.citations,
    sources: [...sources.values()]
      .map((s) => {
        const w = input.registry.get(s.src.workId);
        return {
          workId: s.src.workId,
          contentHash: (w?.contentHash ?? '0x') as Hex,
          version: w?.version ?? 0,
          text: s.src.text,
        };
      })
      .sort((a, b) => (a.workId < b.workId ? -1 : 1)),
    unregistered: input.unregistered.map((u) => ({ url: u.url, text: u.text })),
    leaves: leaves.map((l) => ({
      workId: l.workId,
      version: l.version,
      spanHash: l.spanHash,
      amount: l.amount.toString(),
      origin: l.origin,
      spans: l.spans,
    })),
    refused,
    owed,
    root: (root ?? '0x') as Hex,
    frontedReadingFees: fronted.toString(),
    transferIds: [...input.transferIds].sort(),
    gatewayTransfersHash,
    feeBps: Number(FEE_BPS),
    strike: null,
    reconciliation: [],
  };

  return {
    leaves,
    refused,
    owed,
    root,
    gatewayTransfersHash,
    totals: { total, fee, fronted, spend: total + fee + fronted },
    bundle,
  };
}

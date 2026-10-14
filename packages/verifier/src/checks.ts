import {
  canonicalJson,
  contentHash,
  inputFromBundle,
  leafHash,
  merkleRoot,
  normalize,
  parseBundle,
  quotedSegments,
  runKernel,
  sha256Hex,
  transfersHash,
  type Bundle,
  type Hex,
  type RegistrySnapshot,
  type RegistryWork,
  type WorkId,
} from '@honorar/kernel';

export type Status = 'PASS' | 'FAIL' | 'UNKNOWN';

export type CheckResult = {
  id: string;
  title: string;
  invariants: string[];
  status: Status;
  detail: string;
};

export type StrikeLog = {
  kind: 'QuoteStruck' | 'AnswerStruck';
  args: Record<string, unknown>;
};

/** The only network surface the verifier uses: an Arc RPC. */
export interface ChainReader {
  readWork(workId: WorkId, block: bigint): Promise<RegistryWork | null>;
  readRoot(answerId: Hex, block: bigint): Promise<Hex>;
  strikeLogs(txHash: Hex): Promise<StrikeLog[]>;
}

export type VerifyOptions = {
  withGateway?: boolean;
  gatewayStatus?: (transferId: string) => Promise<{ status: string; amount: bigint } | null>;
};

const res = (id: string, title: string, invariants: string[], status: Status, detail: string): CheckResult => ({
  id,
  title,
  invariants,
  status,
  detail,
});

export function v1Canonical(text: string): CheckResult {
  const title = 'Bundle is canonical JSON';
  try {
    const parsed = parseBundle(text);
    const same = canonicalJson(parsed) === text;
    return res('V1', title, ['I7'], same ? 'PASS' : 'FAIL', same ? `sha256 ${sha256Hex(text)}` : 'bytes differ from canonical form');
  } catch (e) {
    return res('V1', title, ['I7'], 'FAIL', `unparseable: ${(e as Error).message}`);
  }
}

function strikeBlock(b: Bundle): bigint | null {
  return b.strike ? BigInt(b.strike.blockNumber) : null;
}

export async function v2SourceHashes(b: Bundle, chain: ChainReader): Promise<CheckResult> {
  const title = 'Every source hashes to its on-chain contentHash';
  const block = strikeBlock(b);
  const bad: string[] = [];
  for (const s of b.sources) {
    const local = contentHash(s.text);
    if (local !== s.contentHash) bad.push(`${s.workId}: text hash differs from bundle contentHash`);
    if (block !== null) {
      const w = await chain.readWork(s.workId, block);
      if (!w) bad.push(`${s.workId}: not in registry`);
      else if (w.contentHash !== local) bad.push(`${s.workId}: text hash differs from on-chain contentHash`);
    }
  }
  if (block === null) return res('V2', title, ['I1'], 'UNKNOWN', 'bundle has no strike record');
  return res('V2', title, ['I1'], bad.length ? 'FAIL' : 'PASS', bad.length ? bad.join('; ') : `${b.sources.length} sources checked`);
}

export function v3SpansInSourceAndAnswer(b: Bundle): CheckResult {
  const title = 'Every paid span is in its source and in the answer';
  const segs = quotedSegments(b.answer);
  const bad: string[] = [];
  for (const leaf of b.leaves) {
    const src = b.sources.find((s) => s.workId === leaf.workId);
    if (!src) {
      bad.push(`${leaf.workId}: source missing`);
      continue;
    }
    const norm = normalize(src.text);
    for (const span of leaf.spans) {
      if (!norm.includes(span)) bad.push(`${leaf.workId}: span not in source`);
      if (!segs.some((g) => span.includes(g) || g.includes(span))) bad.push(`${leaf.workId}: span not quoted in answer`);
    }
  }
  return res('V3', title, ['I1', 'I2'], bad.length ? 'FAIL' : 'PASS', bad.length ? bad.join('; ') : `${b.leaves.length} leaves checked`);
}

export async function v4Completeness(b: Bundle, chain: ChainReader): Promise<CheckResult> {
  const title = 'Completeness sweep reproduces the same leaves and owed set';
  const block = strikeBlock(b);
  if (block === null) return res('V4', title, ['I3'], 'UNKNOWN', 'bundle has no strike record');
  const snap = await buildSnapshot(b, chain, block);
  const r = runKernel(inputFromBundle(b, snap));
  const key = (l: { workId: string; version: number; spanHash: string; amount: bigint | string }): string =>
    `${l.workId}|${l.version}|${l.spanHash}|${l.amount}`;
  const got = r.leaves.map((l) => key(l)).sort();
  const want = b.leaves.map((l) => key(l)).sort();
  const owedKey = (o: { reason: string; sourceUrl: string | null; workId: string | null; quote: string }): string =>
    `${o.reason}|${o.sourceUrl}|${o.workId}|${o.quote}`;
  const gotOwed = r.owed.map(owedKey).sort();
  const wantOwed = b.owed.map(owedKey).sort();
  const ok = JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(gotOwed) === JSON.stringify(wantOwed);
  return res('V4', title, ['I3'], ok ? 'PASS' : 'FAIL', ok ? `${got.length} leaves, ${gotOwed.length} owed reproduced` : 'recomputed set differs from bundle');
}

export async function v5Root(b: Bundle, chain: ChainReader): Promise<CheckResult> {
  const title = 'Merkle root recomputed equals the on-chain root';
  const block = strikeBlock(b);
  const hashes = b.leaves.map((l) => leafHash(l.workId, l.version, l.spanHash, BigInt(l.amount)));
  const local = hashes.length ? merkleRoot(hashes) : null;
  if (local !== b.root) return res('V5', title, ['I7'], 'FAIL', `bundle root ${b.root} != recomputed ${local}`);
  if (block === null) return res('V5', title, ['I7'], 'UNKNOWN', 'bundle has no strike record');
  const onchain = await chain.readRoot(b.answerId, block);
  const ok = onchain.toLowerCase() === local.toLowerCase();
  return res('V5', title, ['I7'], ok ? 'PASS' : 'FAIL', ok ? `root ${local}` : `on-chain ${onchain} != ${local}`);
}

export async function v6Events(b: Bundle, chain: ChainReader): Promise<CheckResult> {
  const title = 'On-chain events match leaves, amounts, fee and fronted';
  if (!b.strike) return res('V6', title, ['I4', 'I5'], 'UNKNOWN', 'bundle has no strike record');
  const logs = await chain.strikeLogs(b.strike.txHash);
  const quotes = logs.filter((l) => l.kind === 'QuoteStruck');
  const ans = logs.find((l) => l.kind === 'AnswerStruck');
  const bad: string[] = [];
  if (!ans) bad.push('AnswerStruck event missing');
  if (quotes.length !== b.leaves.length) bad.push(`QuoteStruck count ${quotes.length} != leaves ${b.leaves.length}`);
  const seen = new Set<string>();
  for (const q of quotes) {
    const id = String(q.args.workId).toLowerCase();
    if (seen.has(id)) bad.push(`duplicate QuoteStruck for ${id}`);
    seen.add(id);
    const leaf = b.leaves.find((l) => l.workId.toLowerCase() === id);
    if (!leaf) bad.push(`event for unknown leaf ${id}`);
    else if (BigInt(q.args.amount as bigint) !== BigInt(leaf.amount) || String(q.args.spanHash).toLowerCase() !== leaf.spanHash.toLowerCase()) {
      bad.push(`event differs from leaf ${id}`);
    }
  }
  if (ans) {
    const total = b.leaves.reduce((a, l) => a + BigInt(l.amount), 0n);
    const fee = (total * BigInt(b.feeBps)) / 10_000n;
    if (BigInt(ans.args.total as bigint) !== total) bad.push('total differs');
    if (BigInt(ans.args.fee as bigint) !== fee) bad.push('fee differs');
    if (BigInt(ans.args.frontedReadingFees as bigint) !== BigInt(b.frontedReadingFees)) bad.push('fronted differs');
    if (String(ans.args.answerId).toLowerCase() !== b.answerId.toLowerCase()) bad.push('answerId differs');
  }
  return res('V6', title, ['I4', 'I5'], bad.length ? 'FAIL' : 'PASS', bad.length ? bad.join('; ') : `${quotes.length} quotes, one answer event`);
}

export async function v7Versions(b: Bundle, chain: ChainReader): Promise<CheckResult> {
  const title = 'Work versions and prices at the strike block match the leaves';
  const block = strikeBlock(b);
  if (block === null) return res('V7', title, ['I6'], 'UNKNOWN', 'bundle has no strike record');
  const bad: string[] = [];
  for (const l of b.leaves) {
    const w = await chain.readWork(l.workId, block);
    if (!w) bad.push(`${l.workId}: not in registry`);
    else {
      if (w.version !== l.version) bad.push(`${l.workId}: version ${w.version} != ${l.version}`);
      if (w.quotePrice !== BigInt(l.amount)) bad.push(`${l.workId}: price ${w.quotePrice} != ${l.amount}`);
    }
  }
  return res('V7', title, ['I6'], bad.length ? 'FAIL' : 'PASS', bad.length ? bad.join('; ') : `${b.leaves.length} leaves checked`);
}

export async function v8Gateway(b: Bundle, opts: VerifyOptions): Promise<CheckResult> {
  const title = 'Gateway transfer ids match the committed hash';
  const hash = transfersHash(b.transferIds);
  if (hash !== b.gatewayTransfersHash) return res('V8', title, ['I8'], 'FAIL', `hash ${hash} != ${b.gatewayTransfersHash}`);
  if (b.strike && opts.withGateway && opts.gatewayStatus) {
    let sum = 0n;
    const bad: string[] = [];
    for (const id of b.transferIds) {
      const t = await opts.gatewayStatus(id);
      if (!t) bad.push(`${id}: not found`);
      else {
        sum += t.amount;
        if (t.status !== 'completed') bad.push(`${id}: ${t.status}`);
      }
    }
    if (sum !== BigInt(b.frontedReadingFees)) bad.push(`transfers sum ${sum} != fronted ${b.frontedReadingFees}`);
    return res('V8', title, ['I8'], bad.length ? 'FAIL' : 'PASS', bad.length ? bad.join('; ') : `${b.transferIds.length} transfers completed`);
  }
  return res('V8', title, ['I8'], 'PASS', `commitment holds for ${b.transferIds.length} transfers (status not checked without --with-gateway)`);
}

export function v9Netting(b: Bundle): CheckResult {
  const title = 'Batch netting reconciliation (I9)';
  if (b.reconciliation.length === 0) return res('V9', title, ['I9'], 'UNKNOWN', 'no batch reconciliation recorded for this answer yet');
  const bad = b.reconciliation.filter((r) => r.verdict === 'MISMATCH');
  const unknown = b.reconciliation.filter((r) => r.verdict === 'UNKNOWN');
  if (bad.length) return res('V9', title, ['I9'], 'FAIL', `${bad.length} batch mismatches`);
  if (unknown.length === b.reconciliation.length) return res('V9', title, ['I9'], 'UNKNOWN', 'observed credit unavailable from RPC');
  return res('V9', title, ['I9'], 'PASS', `${b.reconciliation.length} batches reconciled`);
}

async function buildSnapshot(b: Bundle, chain: ChainReader, block: bigint): Promise<RegistrySnapshot> {
  const map = new Map<WorkId, RegistryWork>();
  for (const s of b.sources) {
    const w = await chain.readWork(s.workId, block);
    if (w) map.set(s.workId, w);
  }
  return map;
}

export async function verifyBundle(text: string, chain: ChainReader, opts: VerifyOptions = {}): Promise<CheckResult[]> {
  const v1 = v1Canonical(text);
  if (v1.status === 'FAIL' && v1.detail.startsWith('unparseable')) return [v1];
  const b = parseBundle(text);
  return [
    v1,
    await v2SourceHashes(b, chain),
    v3SpansInSourceAndAnswer(b),
    await v4Completeness(b, chain),
    await v5Root(b, chain),
    await v6Events(b, chain),
    await v7Versions(b, chain),
    await v8Gateway(b, opts),
    v9Netting(b),
  ];
}

export function allPass(results: CheckResult[], required = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']): boolean {
  return required.every((id) => results.find((r) => r.id === id)?.status === 'PASS');
}

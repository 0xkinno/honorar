import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), '..', '..');

function readJson<T>(rel: string): T | null {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

export type BreakResult = { id: string; attack: string; targets: string[]; expected: string; observed: string; verdict: string; env: string };

export function breakResults(): BreakResult[] {
  const dir = join(root, 'evidence', 'break');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'summary.json')
    .map((f) => readJson<BreakResult>(`evidence/break/${f}`))
    .filter((r): r is BreakResult => r !== null)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export type Deployment = { registry: string; ledger: string; registryTx: string; ledgerTx: string; block: number; deployedAt: string };
export const deployment = (): Deployment | null => readJson<Deployment>('deployments/arc-mainnet.json');

export type Benchmark = {
  arms: Record<string, { misdirectedPct: number; unpaidUse: number; fabricatedPaid: number }>;
  questions: number;
  models: string[];
};
export const benchmark = (): Benchmark | null => readJson<Benchmark>('evidence/benchmark.json');

export type Featured = {
  sentence: string;
  workTitle: string;
  contentHash: string;
  answerId: string;
  strikeTx: string;
  block: number;
  amount: string;
  batchTx: string | null;
  transferId: string | null;
  medianSeconds: number | null;
  batchTransfers: number | null;
  refused: { answerId: string; reason: string } | null;
};
export const featured = (): Featured | null => readJson<Featured>('apps/web/content/featured-bundle.json');

export type TestCounts = { forge: number; kernel: number; verifier: number; agent: number };
export const testCounts = (): TestCounts | null => readJson<TestCounts>('evidence/tests.json');

export type E1 = { summary: { p50Seconds: Record<string, number>; completedPct: number; n: number } };
export const discoveryE1 = (): E1 | null => readJson<E1>('evidence/discovery/E1.json');

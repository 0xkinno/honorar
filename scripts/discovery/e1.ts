import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Hex } from 'viem';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const API = process.env.AGENT_URL ?? 'http://localhost:8787';
const gw = new GatewayClient({ chain: 'arc', privateKey: env.AGENT_PRIVATE_KEY as Hex, rpcUrl: env.ARC_RPC_URL });
const maxMs = Number(process.argv[2] ?? 20 * 60_000);

type T = { id: string; createdAt: string; state: string };
const list = ((await (await fetch(`${API}/transfers`)).json()) as T[]).filter((t) => !t.id.startsWith('unconfirmed:'));
const seen: Record<string, Record<string, number>> = {};
const raw: Record<string, unknown> = {};
const start = Date.now();
const created: Record<string, number> = {};
for (const t of list) {
  created[t.id] = Date.parse(t.createdAt);
  seen[t.id] = {};
}
for (;;) {
  let open = 0;
  for (const t of list) {
    if (seen[t.id]?.completed !== undefined || seen[t.id]?.failed !== undefined) continue;
    open++;
    const r = await gw.getTransferById(t.id);
    raw[t.id] = r;
    const s = seen[t.id] as Record<string, number>;
    if (s[r.status] === undefined) s[r.status] = Date.now();
  }
  if (open === 0 || Date.now() - start > maxMs) break;
  await new Promise((r) => setTimeout(r, 5000));
}
const secs = (id: string, st: string): number | null => {
  const v = seen[id]?.[st];
  return v === undefined ? null : Math.round((v - (created[id] as number)) / 100) / 10;
};
const pct = (xs: number[], p: number): number | null => (xs.length ? ([...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] as number) : null);
const states = ['received', 'batched', 'confirmed', 'completed'];
const summary: Record<string, unknown> = { n: list.length };
for (const st of states) {
  const xs = list.map((t) => secs(t.id, st)).filter((x): x is number => x !== null);
  summary[st] = { observed: xs.length, p50: pct(xs, 50), p95: pct(xs, 95) };
}
const completed = list.filter((t) => seen[t.id]?.completed !== undefined).length;
const sample = Object.values(raw)[0] as Record<string, unknown> | undefined;
mkdirSync('evidence/discovery', { recursive: true });
writeFileSync(
  'evidence/discovery/E1.json',
  `${JSON.stringify(
    {
      experiment: 'E1',
      question: 'How long from received to completed for Gateway reading fees?',
      commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      ranAt: new Date().toISOString(),
      note: 'Seconds are measured from the seller record createdAt to the first poll that observed the status, polled every 5s, so they are upper bounds by up to 5s.',
      summary: { n: list.length, completedPct: Math.round((completed / Math.max(1, list.length)) * 1000) / 10, p50Seconds: Object.fromEntries(states.map((s) => [s, (summary[s] as { p50: number | null }).p50])), p95Seconds: Object.fromEntries(states.map((s) => [s, (summary[s] as { p95: number | null }).p95])), detail: summary, fieldsInTransferObject: sample ? Object.keys(sample) : [] },
      transfers: list.map((t) => ({ id: t.id, secondsTo: Object.fromEntries(states.map((s) => [s, secs(t.id, s)])) })),
      rawSample: sample ?? null,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(`E1 n=${list.length} completed=${completed}\n`);

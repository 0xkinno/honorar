import { mkdirSync, writeFileSync } from 'node:fs';
import { canonicalJson } from '../packages/kernel/src/index';

const API = process.env.AGENT_URL ?? 'http://localhost:8787';
const QS = [
  'How do micropayments, batching, netting, citation checks and spending mandates fit together when paying writers?',
  'What must a system prove to pay writers fairly: finality, batching, quotation checks, spending caps and receipts?',
  'Explain how stablecoin finality, micropayment batching, netted payments, verified citations, agent spending limits and writer receipts work together.',
  'Why do writers need proof of use, and how do batching, netting, finality, citation checks and spending mandates make that possible?',
];
mkdirSync('evidence/mainnet', { recursive: true });
const want = Number(process.argv[2] ?? 4);
let n = 0;
for (const question of QS.slice(0, want)) {
  const res = await fetch(`${API}/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, reader: 'house' }) });
  const text = await res.text();
  const evs = text.split('\n\n').map((b) => b.split('\n').find((l) => l.startsWith('data:'))?.slice(5)).filter(Boolean).map((d) => JSON.parse(d as string) as Record<string, unknown>);
  const done = evs.find((e) => e.stage === 'done');
  const err = evs.find((e) => e.stage === 'error');
  if (!done) {
    process.stdout.write(`${++n}. error ${String(err?.message)}\n`);
    continue;
  }
  const b = (await (await fetch(`${API}/bundle/${done.answerId}`)).json()) as { strike: unknown; leaves: unknown[]; transferIds: unknown[] };
  writeFileSync(`evidence/mainnet/${String(done.answerId).slice(0, 12)}.json`, canonicalJson(b));
  process.stdout.write(`${++n}. leaves=${b.leaves.length} reads=${b.transferIds.length} struck=${b.strike !== null}\n`);
}

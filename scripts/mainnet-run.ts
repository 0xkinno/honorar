import { mkdirSync, writeFileSync } from 'node:fs';
import { canonicalJson } from '../packages/kernel/src/index';

const API = process.env.AGENT_URL ?? 'http://localhost:8787';
const QUESTIONS = [
  'When is a stablecoin payment considered final?',
  'Why does a stablecoin payment sent on Sunday night clear as fast as one on Monday?',
  'How do card payments settle compared with stablecoins?',
  'What makes tiny reading fees practical for writers?',
  'How does batching make micropayments cheap?',
  'What is the difference between an authorization and a settlement?',
  'Why does deterministic finality matter for a payment?',
  'What does it mean that a stablecoin ledger never closes?',
  'How are fees quoted when settling stablecoins?',
  'Why is a card authorization only a promise?',
  'How are many small authorizations netted together?',
  'What changes for writers when the rail has no fixed minimum cost?',
];
mkdirSync('evidence/mainnet', { recursive: true });
const out: { question: string; answerId: string | null; struck: boolean; error?: string }[] = [];
for (const question of QUESTIONS.slice(0, Number(process.argv[2] ?? QUESTIONS.length))) {
  const res = await fetch(`${API}/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, reader: 'house' }) });
  const body = await res.text();
  const events = body.split('\n\n').map((b) => b.split('\n').find((l) => l.startsWith('data:'))?.slice(5)).filter(Boolean).map((d) => JSON.parse(d as string) as Record<string, unknown>);
  const done = events.find((e) => e.stage === 'done');
  const err = events.find((e) => e.stage === 'error');
  if (done) {
    const b = (await (await fetch(`${API}/bundle/${done.answerId}`)).json()) as { strike: unknown };
    writeFileSync(`evidence/mainnet/${String(done.answerId).slice(0, 12)}.json`, canonicalJson(b));
    out.push({ question, answerId: String(done.answerId), struck: b.strike !== null });
  } else {
    out.push({ question, answerId: null, struck: false, error: String(err?.message ?? res.status) });
  }
  process.stdout.write(`${out.length}. ${out[out.length - 1]?.struck ? 'STRUCK' : 'no strike'} ${out[out.length - 1]?.error ?? ''} ${question}\n`);
}
writeFileSync('evidence/mainnet/run-1.json', `${JSON.stringify({ ranAt: new Date().toISOString(), results: out }, null, 2)}\n`);

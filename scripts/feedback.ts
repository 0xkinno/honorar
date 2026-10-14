import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createArcClient } from '../packages/chain/src/index';
import { feedbackScore, giveFeedback, type FeedbackTag } from '../services/agent/src/erc8004';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const dir = 'evidence/mainnet';
const id = BigInt(JSON.parse(readFileSync(`${dir}/erc8004.json`, 'utf8')).agentId);
const client = createArcClient(env.ARC_RPC_URL);
const file = `${dir}/feedback.json`;
type Entry = { answerId: string; score: number; tx: string; tag?: string };
const have: Entry[] = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { feedback: Entry[] }).feedback : [];
const seen = new Set(have.map((e) => e.answerId.toLowerCase()));
const names = readdirSync(dir).filter((n) => /^0x[0-9a-f]{10}\.json$/.test(n) || n === 'answer-1.json' || /^wallet-.*\.json$/.test(n));
for (const f of names) {
  const b = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { answerId: `0x${string}`; strike: unknown; leaves: unknown[]; citations: unknown[] };
  if (seen.has(b.answerId.toLowerCase())) continue;
  const struck = b.strike !== null;
  const score = feedbackScore(b.leaves.length, b.citations.length);
  const tag: FeedbackTag = struck ? 'answer_settled' : 'answer_refused';
  const tx = await giveFeedback(client, env.ARC_RPC_URL as string, env.VALIDATOR_PRIVATE_KEY as `0x${string}`, id, score, b.answerId, tag);
  have.push({ answerId: b.answerId, score, tx, tag });
  seen.add(b.answerId.toLowerCase());
  process.stdout.write(`${b.answerId.slice(0, 12)} ${tag} score ${score} ${tx}\n`);
  writeFileSync(file, `${JSON.stringify({ agentId: id.toString(), feedback: have }, null, 2)}\n`);
}
writeFileSync(file, `${JSON.stringify({ agentId: id.toString(), feedback: have }, null, 2)}\n`);
process.stdout.write(`total feedback entries ${have.length}\n`);

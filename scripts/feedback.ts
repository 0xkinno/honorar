import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createArcClient } from '../packages/chain/src/index';
import { feedbackScore, giveFeedback } from '../services/agent/src/erc8004';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const id = BigInt(JSON.parse(readFileSync('evidence/mainnet/erc8004.json', 'utf8')).agentId);
const client = createArcClient(env.ARC_RPC_URL);
const done: { answerId: string; score: number; tx: string }[] = [];
for (const f of readdirSync('evidence/mainnet').filter((n) => /^0x[0-9a-f]{10}\.json$/.test(n))) {
  const b = JSON.parse(readFileSync(`evidence/mainnet/${f}`, 'utf8')) as { answerId: `0x${string}`; strike: unknown; leaves: { origin: string }[]; refused: unknown[] };
  if (!b.strike) continue;
  const verified = b.leaves.filter((l) => l.origin === 'model').length;
  const score = feedbackScore(verified, verified + b.refused.length);
  const tx = await giveFeedback(client, env.ARC_RPC_URL as string, env.VALIDATOR_PRIVATE_KEY as `0x${string}`, id, score, b.answerId);
  done.push({ answerId: b.answerId, score, tx });
  process.stdout.write(`${b.answerId.slice(0, 12)} score ${score} ${tx}\n`);
}
writeFileSync('evidence/mainnet/feedback.json', `${JSON.stringify({ agentId: id.toString(), feedback: done }, null, 2)}\n`);

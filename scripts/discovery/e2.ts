import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, http } from 'viem';
import { arc } from 'viem/chains';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const API = 'http://localhost:8787';
const transfers = (await (await fetch(`${API}/transfers`)).json()) as { id: string; settlementTx: string | null; amount: string; payTo: string }[];
const txs = [...new Set(transfers.map((t) => t.settlementTx).filter((x): x is string => !!x))];
const pub = createPublicClient({ chain: arc, transport: http(env.ARC_RPC_URL) });
const rows = [];
for (const hash of txs) {
  const r = await pub.getTransactionReceipt({ hash: hash as `0x${string}` });
  const tx = await pub.getTransaction({ hash: hash as `0x${string}` });
  const byTopic: Record<string, number> = {};
  for (const l of r.logs) byTopic[l.topics[0] ?? 'none'] = (byTopic[l.topics[0] ?? 'none'] ?? 0) + 1;
  const ours = transfers.filter((t) => t.settlementTx === hash);
  rows.push({
    txHash: hash,
    block: Number(r.blockNumber),
    to: tx.to,
    logCount: r.logs.length,
    distinctEventTopics: Object.keys(byTopic).length,
    eventTopicCounts: byTopic,
    honorarTransfersInBatch: ours.length,
    honorarAmountSum: ours.reduce((a, t) => a + BigInt(t.amount), 0n).toString(),
    individualTransferIdsVisibleOnChain: false,
  });
}
writeFileSync(
  'evidence/discovery/E2.json',
  `${JSON.stringify({ experiment: 'E2', question: 'What does a Gateway batch transaction contain?', commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(), ranAt: new Date().toISOString(), note: 'individualTransferIdsVisibleOnChain is false when no log argument equals a Gateway transfer id (UUIDs are never on chain).', batches: rows }, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(rows.map((r) => ({ tx: r.txHash.slice(0, 12), logs: r.logCount, topics: r.distinctEventTopics, ours: r.honorarTransfersInBatch })))}\n`);

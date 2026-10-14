import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { createPublicClient, http, type Hex } from 'viem';
import { arc } from 'viem/chains';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const gw = new GatewayClient({ chain: 'arc', privateKey: env.AGENT_PRIVATE_KEY as Hex, rpcUrl: env.ARC_RPC_URL });
const pub = createPublicClient({ chain: arc, transport: http(env.ARC_RPC_URL) });
const ranAt = new Date().toISOString();

const all: { from: string; amount: string; status: string }[] = [];
const sr = await gw.searchTransfers({ from: gw.address, pageSize: 100 });
all.push(...sr.transfers);
const completed = all.filter((t) => t.status === 'completed');
const sumAll = all.reduce((a, t) => a + BigInt(t.amount), 0n);

// E3: buyer funds locked
const bal = await gw.getBalances();
const deposited = 40_000n;
writeFileSync('evidence/discovery/E3.json', `${JSON.stringify({ experiment: 'E3', question: 'When are buyer funds locked and how does the Gateway balance move?', commit, ranAt, depositedBaseUnits: deposited.toString(), transfersFromAgent: all.length, transfersSumBaseUnits: sumAll.toString(), expectedAvailable: (deposited - sumAll).toString(), observedGateway: { total: bal.gateway.total.toString(), available: bal.gateway.available.toString(), withdrawing: bal.gateway.withdrawing.toString(), withdrawable: bal.gateway.withdrawable.toString() }, matchesExpected: bal.gateway.available === deposited - sumAll || bal.gateway.total === deposited - sumAll }, null, 2)}\n`);

// E5: writer credit versus the sum of transfers to that writer
const writer = env.WRITER_TEST_ADDRESS as Hex;
const wb = await gw.getBalances(writer);
const toWriter = (await gw.searchTransfers({ from: gw.address, to: writer, pageSize: 100 })).transfers;
const settledToWriter = toWriter.filter((t) => t.status === 'completed').reduce((a, t) => a + BigInt(t.amount), 0n);
writeFileSync('evidence/discovery/E5.json', `${JSON.stringify({ experiment: 'E5', question: 'Can a writer batch credit be reconciled from observable state?', commit, ranAt, method: 'Writer Gateway balance via getBalances(writer) compared with the sum of completed transfers to that writer. Per-block archive reads of GatewayWallet were not used.', transfersToWriter: toWriter.length, completedToWriterBaseUnits: settledToWriter.toString(), writerGatewayTotal: wb.gateway.total.toString(), verdict: wb.gateway.total === settledToWriter ? 'MATCH' : wb.gateway.total > settledToWriter ? 'WRITER_HAS_OTHER_INCOME' : 'MISMATCH' }, null, 2)}\n`);

// E6: strike gas
const rows: { leaves: number; gasUsed: string; effectiveGasPrice: string; usdc: string; txHash: string }[] = [];
for (const f of readdirSync('evidence/mainnet').filter((n) => /^0x[0-9a-f]{10}\.json$/.test(n) || n === 'answer-1.json')) {
  const b = JSON.parse(readFileSync(`evidence/mainnet/${f}`, 'utf8')) as { strike: { txHash: Hex } | null; leaves: unknown[] };
  if (!b.strike) continue;
  const r = await pub.getTransactionReceipt({ hash: b.strike.txHash });
  const cost = r.gasUsed * r.effectiveGasPrice;
  rows.push({ leaves: b.leaves.length, gasUsed: r.gasUsed.toString(), effectiveGasPrice: r.effectiveGasPrice.toString(), usdc: (Number(cost) / 1e18).toFixed(6), txHash: b.strike.txHash });
}
writeFileSync('evidence/discovery/E6.json', `${JSON.stringify({ experiment: 'E6', question: 'What does a strike cost?', commit, ranAt, note: 'Only single-leaf strikes were exercised on mainnet; 3, 5 and 10 leaf costs are UNKNOWN until more works are registered.', strikes: rows }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ transfers: all.length, bal: bal.gateway.formattedAvailable, writerTotal: wb.gateway.total.toString(), settledToWriter: settledToWriter.toString(), strikes: rows.map((r) => `${r.leaves}:${r.usdc}`) })}\n`);

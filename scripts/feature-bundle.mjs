import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const API = process.env.AGENT_URL ?? 'https://honorar-api.onrender.com';
const bundle = JSON.parse(readFileSync('evidence/mainnet/answer-1.json', 'utf8'));
const e1 = JSON.parse(readFileSync('evidence/discovery/E1.json', 'utf8'));
const leaf = bundle.leaves[0];
const source = bundle.sources.find((s) => s.workId === leaf.workId);
const transfers = await (await fetch(`${API}/transfers?answer=${bundle.answerId}`)).json();
const t = transfers[0] ?? null;
const out = {
  sentence: leaf.spans[0],
  workTitle: 'How stablecoins settle',
  contentHash: source.contentHash,
  answerId: bundle.answerId,
  strikeTx: bundle.strike.txHash,
  block: bundle.strike.blockNumber,
  amount: (Number(leaf.amount) / 1e6).toFixed(3),
  batchTx: t?.settlementTx ?? null,
  transferId: t?.id ?? null,
  medianSeconds: e1.latencySeconds.p50,
  batchTransfers: (() => {
    const e2 = JSON.parse(readFileSync('evidence/discovery/E2.json', 'utf8'));
    const hit = e2.batches.find((b) => b.txHash === (t?.settlementTx ?? ''));
    return (hit ?? e2.batches.reduce((a, b) => (b.honorarTransfersInBatch > a.honorarTransfersInBatch ? b : a))).honorarTransfersInBatch;
  })(),
  refused: (() => {
    const dir = 'evidence/mainnet';
    for (const n of readdirSync(dir).filter((x) => /^0x[0-9a-f]{10}\.json$/.test(x))) {
      const b = JSON.parse(readFileSync(`${dir}/${n}`, 'utf8'));
      if (!b.strike && b.refused[0]) return { answerId: b.answerId, reason: b.refused[0].reason };
    }
    return null;
  })(),
};
mkdirSync('apps/web/content', { recursive: true });
writeFileSync('apps/web/content/featured-bundle.json', `${JSON.stringify(out, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(out).slice(0, 300)}\n`);

const fbPath = 'evidence/mainnet/feedback.json';
const fb = JSON.parse(readFileSync(fbPath, 'utf8'));
writeFileSync('apps/web/content/feedback.json', `${JSON.stringify(fb, null, 2)}\n`);

import { readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, http } from 'viem';
import { arc } from 'viem/chains';

const setup = readFileSync('reference/video/takes/wallet-hashes-setup.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ask = JSON.parse(readFileSync('reference/video/takes/wallet-run.json', 'utf8'));
const API = 'https://honorar-api.onrender.com';
const bundle = await (await fetch(`${API}/bundle/${ask.answerId}`)).json();
const { canonicalJson } = await import('../packages/kernel/src/index.ts');
writeFileSync(`evidence/mainnet/wallet-${ask.answerId.slice(0, 12)}.json`, canonicalJson(bundle));
const pub = createPublicClient({ chain: arc, transport: http('https://rpc.mainnet.arc.io') });
const blocks = {};
for (const h of [...setup.map((s) => s.hash), ask.strikeTx]) {
  const r = await pub.getTransactionReceipt({ hash: h });
  blocks[h] = Number(r.blockNumber);
}
writeFileSync(
  'evidence/mainnet/wallet-run.json',
  `${JSON.stringify(
    {
      signer: 'project owner wallet through the Capture wallet provider, driven by Playwright Chromium on honorar.vercel.app',
      account: ask.account,
      registerWork: { hash: setup[0].hash, to: setup[0].to, block: blocks[setup[0].hash] },
      approve: { hash: setup[1].hash, to: setup[1].to, block: blocks[setup[1].hash] },
      setMandate: { hash: setup[2].hash, to: setup[2].to, block: blocks[setup[2].hash] },
      answerId: ask.answerId,
      strike: { hash: ask.strikeTx, block: blocks[ask.strikeTx] },
      ranAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);
process.stdout.write('saved\n');

import { readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, encodeAbiParameters, http, keccak256, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';
import { honorarRegistryAbi } from '../packages/chain/src/index';
import { contentHash } from '../packages/kernel/src/index';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const dep = JSON.parse(readFileSync('deployments/arc-mainnet.json', 'utf8')) as { registry: Hex };
const API = env.NEXT_PUBLIC_AGENT_API_URL as string;
const transport = http(env.ARC_RPC_URL);
const pub = createPublicClient({ chain: arc, transport });
const account = privateKeyToAccount(env.WRITER_TEST_PRIVATE_KEY as Hex);
const wallet = createWalletClient({ account, chain: arc, transport });

type Doc = { id: string; title: string; text: string; quotePrice: bigint };
const bench = JSON.parse(readFileSync('corpus/seed/bench-corpus.json', 'utf8')) as { id: string; title: string; text?: string; injected?: boolean }[];
const film = JSON.parse(readFileSync('corpus/seed/film-corpus.json', 'utf8')) as { id: string; title: string; text: string }[];
const prices: Record<string, bigint> = { micro: 3000n, attrib: 5000n, agents: 4000n, netting: 6000n, proof: 4500n };
const docs: Doc[] = [
  ...bench.filter((d) => d.text && !d.injected).map((d) => ({ id: d.id, title: d.title, text: (d.text as string).trim(), quotePrice: prices[d.id] ?? 4000n })),
  ...film.map((d) => ({ id: d.id, title: d.title, text: d.text.trim(), quotePrice: prices[d.id] ?? 4000n })),
];

const out: { id: string; workId: string; contentHash: string; quotePrice: string; tx: string | null }[] = [];
for (const d of docs) {
  const ch = contentHash(d.text);
  const workId = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'address' }], [ch, account.address]));
  const exists = await pub.readContract({ address: dep.registry, abi: honorarRegistryAbi, functionName: 'exists', args: [workId] });
  let tx: Hex | null = null;
  if (!exists) {
    tx = await wallet.writeContract({
      address: dep.registry,
      abi: honorarRegistryAbi,
      functionName: 'registerWork',
      args: [workId, ch, `https://github.com/0xkinno/honorar/blob/main/corpus/seed/${d.id}`, [account.address], [10_000], 1000n, d.quotePrice],
    });
    await pub.waitForTransactionReceipt({ hash: tx });
  }
  const pr = await fetch(`${API}/corpus/preview`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: d.text, url: `https://github.com/0xkinno/honorar/blob/main/corpus/seed/${d.id}`, title: d.title }) });
  const prev = (await pr.json()) as { id: string; contentHash: Hex };
  const br = await fetch(`${API}/corpus/bind`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: prev.id, workId }) });
  out.push({ id: d.id, workId, contentHash: ch, quotePrice: d.quotePrice.toString(), tx });
  process.stdout.write(`${d.id} ${tx ?? 'already registered'} bind ${br.status}\n`);
}
writeFileSync('evidence/mainnet/corpus.json', `${JSON.stringify({ writer: account.address, works: out, ranAt: new Date().toISOString(), note: 'Original articles written for this build, registered under the project writer wallet.' }, null, 2)}\n`);

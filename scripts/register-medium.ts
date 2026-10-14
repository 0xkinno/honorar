import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
const account = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY as Hex);
const wallet = createWalletClient({ account, chain: arc, transport });
const only = process.argv.slice(2);
const index = JSON.parse(readFileSync('corpus/medium/index.json', 'utf8')) as { slug: string; title: string; url: string }[];
const outFile = 'evidence/mainnet/medium.json';
const done: Record<string, unknown>[] = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, 'utf8')) as { works: Record<string, unknown>[] }).works : [];
for (const it of index.filter((i) => only.length === 0 || only.includes(i.slug))) {
  const text = readFileSync(`corpus/medium/${it.slug}.txt`, 'utf8').trim();
  const ch = contentHash(text);
  const workId = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'address' }], [ch, account.address]));
  const exists = await pub.readContract({ address: dep.registry, abi: honorarRegistryAbi, functionName: 'exists', args: [workId] });
  let tx: Hex | null = null;
  if (!exists) {
    tx = await wallet.writeContract({ address: dep.registry, abi: honorarRegistryAbi, functionName: 'registerWork', args: [workId, ch, it.url, [account.address], [10_000], 1000n, 4000n] });
    await pub.waitForTransactionReceipt({ hash: tx });
  }
  const pr = await fetch(`${API}/corpus/preview`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, url: it.url, title: it.title }) });
  const prev = (await pr.json()) as { id: string };
  const br = await fetch(`${API}/corpus/bind`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: prev.id, workId }) });
  process.stdout.write(`${it.slug} ${tx ?? 'already registered'} bind ${br.status} workId ${workId}\n`);
  done.push({ slug: it.slug, title: it.title, url: it.url, workId, contentHash: ch, registerTx: tx });
}
writeFileSync(outFile, `${JSON.stringify({ registrant: account.address, works: done, note: 'Articles by the builder, registered through the project owner wallet.' }, null, 2)}\n`);

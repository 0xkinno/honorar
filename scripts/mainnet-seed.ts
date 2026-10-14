import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, encodeAbiParameters, erc20Abi, http, keccak256, parseUnits, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { ADDRESSES, honorarLedgerAbi, honorarRegistryAbi } from '../packages/chain/src/index';
import { contentHash } from '../packages/kernel/src/index';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const dep = JSON.parse(readFileSync('deployments/arc-mainnet.json', 'utf8')) as { registry: Hex; ledger: Hex };
const API = env.NEXT_PUBLIC_AGENT_API_URL as string;
const transport = http(env.ARC_RPC_URL);
const pub = createPublicClient({ chain: arc, transport });
const acct = (k: string) => privateKeyToAccount(env[k] as Hex);
const wallet = (k: string) => createWalletClient({ account: acct(k), chain: arc, transport });
const log = (m: string): void => void process.stdout.write(`${m}\n`);

const TEXT = readFileSync('corpus/seed/stablecoin-settlement.txt', 'utf8').trim();
const URL_ = 'https://github.com/0xkinno/honorar/blob/main/corpus/seed/stablecoin-settlement.txt';
const QUESTIONS = process.argv.slice(2).length ? process.argv.slice(2) : ['How do stablecoin payments differ from card payments when it comes to finality?'];

async function send(who: string, params: Record<string, unknown>): Promise<Hex> {
  const hash = await wallet(who).writeContract(params as never);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== 'success') throw new Error(`tx failed ${hash}`);
  return hash;
}

// 1. house reader allowance and mandate (0.05 USDC per answer, 0.50 per 24h)
const house = acct('HOUSE_READER_PRIVATE_KEY').address;
const m = await pub.readContract({ address: dep.ledger, abi: honorarLedgerAbi, functionName: 'mandates', args: [house] });
if (!m[4]) {
  log(`approve ${await send('HOUSE_READER_PRIVATE_KEY', { address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'approve', args: [dep.ledger, 100_000n] })}`);
  log(`setMandate ${await send('HOUSE_READER_PRIVATE_KEY', { address: dep.ledger, abi: honorarLedgerAbi, functionName: 'setMandate', args: [50_000n, 500_000n] })}`);
} else {
  log('house mandate already active');
}

// 2. agent Gateway deposit for reading fees
const gw = new GatewayClient({ chain: 'arc', privateKey: env.AGENT_PRIVATE_KEY as Hex, rpcUrl: env.ARC_RPC_URL });
const bal = await gw.getBalances();
if (bal.gateway.available < parseUnits('0.02', 6)) {
  const d = await gw.deposit('0.04');
  log(`gateway deposit ${d.depositTxHash}`);
} else {
  log(`gateway balance ${bal.gateway.formattedAvailable}`);
}

// 3. writer registers the seed article
const writer = acct('WRITER_TEST_PRIVATE_KEY').address;
const ch = contentHash(TEXT);
const workId = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'address' }], [ch, writer]));
const exists = await pub.readContract({ address: dep.registry, abi: honorarRegistryAbi, functionName: 'exists', args: [workId] });
let registerTx: Hex | null = null;
if (!exists) {
  registerTx = await send('WRITER_TEST_PRIVATE_KEY', {
    address: dep.registry,
    abi: honorarRegistryAbi,
    functionName: 'registerWork',
    args: [workId, ch, URL_, [writer], [10_000], 1000n, 4000n],
  });
  log(`registerWork ${registerTx}`);
} else {
  log('work already registered');
}

// 4. hand the text to the agent and bind it to the on-chain work
const pr = await fetch(`${API}/corpus/preview`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: TEXT, url: URL_, title: 'How stablecoins settle' }) });
const prev = (await pr.json()) as { id: string; contentHash: Hex; error?: string };
if (!pr.ok) throw new Error(`preview failed: ${prev.error}`);
if (prev.contentHash !== ch) throw new Error('agent content hash differs from local hash');
const br = await fetch(`${API}/corpus/bind`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: prev.id, workId }) });
log(`bind ${br.status}`);

// 5. ask through the real loop: Gateway reading fee, model proposal, kernel, strike
mkdirSync('evidence/mainnet', { recursive: true });
const results: unknown[] = [];
for (const question of QUESTIONS) {
  const res = await fetch(`${API}/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, reader: 'house' }) });
  if (!res.ok || !res.body) {
    log(`ask failed ${res.status} ${await res.text()}`);
    continue;
  }
  const text = await res.text();
  const events = text.split('\n\n').map((b) => b.split('\n').find((l) => l.startsWith('data:'))?.slice(5)).filter(Boolean).map((d) => JSON.parse(d as string) as { stage: string; [k: string]: unknown });
  for (const e of events) log(`  ${e.stage} ${JSON.stringify(e).slice(0, 180)}`);
  const done = events.find((e) => e.stage === 'done');
  if (done) {
    const b = await (await fetch(`${API}/bundle/${done.answerId}`)).text();
    writeFileSync(`evidence/mainnet/${String(done.answerId).slice(0, 12)}.json`, b);
    results.push({ question, answerId: done.answerId });
  }
}
writeFileSync('evidence/mainnet/seed.json', `${JSON.stringify({ workId, contentHash: ch, writer, house, registerTx, answers: results, ranAt: new Date().toISOString() }, null, 2)}\n`);
log('done');

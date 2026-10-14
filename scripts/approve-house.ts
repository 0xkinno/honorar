import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, erc20Abi, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const dep = JSON.parse(readFileSync('deployments/arc-mainnet.json', 'utf8')) as { ledger: Hex };
const transport = http(env.ARC_RPC_URL);
const pub = createPublicClient({ chain: arc, transport });
const w = createWalletClient({ account: privateKeyToAccount(env.HOUSE_READER_PRIVATE_KEY as Hex), chain: arc, transport });
const amount = BigInt(Math.round(Number(process.argv[2] ?? '0.2') * 1e6));
const hash = await w.writeContract({ address: '0x3600000000000000000000000000000000000000', abi: erc20Abi, functionName: 'approve', args: [dep.ledger, amount] });
await pub.waitForTransactionReceipt({ hash });
process.stdout.write(`approved ${amount} ${hash}\n`);

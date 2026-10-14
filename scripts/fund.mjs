import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const plan = JSON.parse(process.argv[2]);
const account = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const transport = http(env.ARC_RPC_URL);
const pub = createPublicClient({ chain: arc, transport });
const wallet = createWalletClient({ account, chain: arc, transport });
for (const [role, amount] of Object.entries(plan)) {
  const to = env[`${role}_ADDRESS`];
  const hash = await wallet.sendTransaction({ to, value: parseEther(amount) });
  await pub.waitForTransactionReceipt({ hash });
  process.stdout.write(`${role} +${amount} ${hash}\n`);
}

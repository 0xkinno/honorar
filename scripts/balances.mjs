import { readFileSync } from 'node:fs';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { arc } from 'viem/chains';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const client = createPublicClient({ chain: arc, transport: http(env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io') });
const USDC = '0x3600000000000000000000000000000000000000';
const chainId = await client.getChainId();
process.stdout.write(`chain ${chainId}\n`);
for (const k of Object.keys(env).filter((k) => k.endsWith('_ADDRESS') && env[k])) {
  const a = env[k];
  const [native, erc20] = await Promise.all([
    client.getBalance({ address: a }),
    client.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [a] }),
  ]);
  process.stdout.write(`${k.padEnd(22)} ${a} native ${formatUnits(native, 18)} erc20 ${formatUnits(erc20, 6)}\n`);
}

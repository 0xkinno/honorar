import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Hex } from 'viem';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const gw = new GatewayClient({ chain: 'arc', privateKey: env.WRITER_TEST_PRIVATE_KEY as Hex, rpcUrl: env.ARC_RPC_URL });
const before = await gw.getBalances();
const amount = (Number(before.gateway.available - 3_600n) / 1e6).toFixed(6);
process.stdout.write(`writer gateway available ${amount}, wallet ${before.wallet.formatted}\n`);
if (before.gateway.available === 0n) throw new Error('nothing available to withdraw');
const r = await gw.withdraw(amount);
const after = await gw.getBalances();
writeFileSync(
  'evidence/discovery/E7.json',
  `${JSON.stringify(
    {
      experiment: 'E7',
      question: 'Can a writer withdraw Gateway earnings?',
      commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      ranAt: new Date().toISOString(),
      signer: 'writer key, SDK withdraw()',
      withdrawn: r.formattedAmount,
      mintTxHash: r.mintTxHash,
      gatewayAvailableBefore: before.gateway.formattedAvailable,
      gatewayAvailableAfter: after.gateway.formattedAvailable,
      walletBefore: before.wallet.formatted,
      walletAfter: after.wallet.formatted,
      note: 'Withdraw needs amount plus a fee from the available balance (observed fee about 0.0035 USDC on a 0.02 balance). Browser-wallet signing of the burn intent was not exercised.',
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(`withdraw tx ${r.mintTxHash}\n`);

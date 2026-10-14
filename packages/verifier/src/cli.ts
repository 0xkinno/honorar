#!/usr/bin/env -S npx tsx
import { readFileSync } from 'node:fs';
import { createArcClient, ARC_CHAIN_ID, ARC_RPC, loadDeployment } from '@honorar/chain';
import { parseBundle, type Hex } from '@honorar/kernel';
import { allPass, verifyBundle } from './checks';
import { rpcReader } from './rpc';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const rpcIdx = args.indexOf('--rpc');
  const rpc = rpcIdx >= 0 ? (args[rpcIdx + 1] as string) : ARC_RPC;
  const withGateway = args.includes('--with-gateway');
  if (!target) {
    process.stderr.write('usage: verify <bundle.json> [--rpc URL] [--with-gateway]\n');
    process.exit(2);
  }
  const text = readFileSync(target, 'utf8');
  const bundle = parseBundle(text);
  const client = createArcClient(rpc);
  const chainId = await client.getChainId();
  if (chainId !== ARC_CHAIN_ID) {
    process.stderr.write(`rpc is chain ${chainId}, expected ${ARC_CHAIN_ID}\n`);
    process.exit(2);
  }
  const registry = (bundle.strike?.registry ?? '0x') as Hex;
  const ledger = (bundle.strike?.ledger ?? '0x') as Hex;
  const dep = loadDeployment();
  if (dep && bundle.strike && (dep.ledger.toLowerCase() !== ledger.toLowerCase() || dep.registry.toLowerCase() !== registry.toLowerCase())) {
    process.stdout.write('WARN bundle points at contracts that differ from deployments/arc-mainnet.json\n');
  }
  const gatewayStatus = withGateway
    ? async (id: string): Promise<{ status: string; amount: bigint } | null> => {
        const r = await fetch(`https://gateway-api.circle.com/v1/x402/transfers/${id}`);
        if (!r.ok) return null;
        const j = (await r.json()) as { status: string; amount: string };
        return { status: j.status, amount: BigInt(j.amount) };
      }
    : undefined;
  const results = await verifyBundle(text, rpcReader(client, registry, ledger), { withGateway, gatewayStatus });
  for (const r of results) {
    process.stdout.write(`${r.status.padEnd(7)} ${r.id}  ${r.title}  [${r.invariants.join(',')}]\n        ${r.detail}\n`);
  }
  const ok = allPass(results);
  process.stdout.write(ok ? '\nVERIFIED\n' : '\nNOT VERIFIED\n');
  process.exit(ok ? 0 : 1);
}

main().catch((e: unknown) => {
  process.stderr.write(`${(e as Error).message}\n`);
  process.exit(2);
});
